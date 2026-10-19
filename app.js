import { initialState, clampThreshold, isFocused, byCreated, validateState, applyImport, setCompletion, createExampleTasks, isExampleTask } from './data.js';
import { openStorage, readState, changeState } from './storage.js';
import { renderMatrix } from './matrix.js';
const $ = id => document.getElementById(id);
let state = initialState(), view = 'active', pendingImport, pendingDelete, ready = false;
const channel = 'BroadcastChannel' in window ? new BroadcastChannel('focus-field') : null;
function notify(message, error = false) { $('notice').textContent = message; $('notice').classList.toggle('error', error); }
function empty(title, detail) {
  const box = document.createElement('div'); box.className = 'empty-state';
  const icon = document.createElement('span'); icon.className = 'empty-icon'; icon.textContent = '✦'; icon.setAttribute('aria-hidden', 'true');
  const heading = document.createElement('strong'); heading.textContent = title;
  const text = document.createElement('span'); text.textContent = detail; box.append(icon, heading, text); return box;
}
function taskRow(task) {
  const row = document.createElement('div'); row.className = 'task-row';
  const check = document.createElement('button'); check.type = 'button'; check.className = 'task-check'; check.textContent = task.status === 'completed' ? '↶' : '○';
  check.setAttribute('aria-label', `${task.status === 'completed' ? 'Restore' : 'Complete'} ${task.title}`);
  check.onclick = async () => { check.disabled = true; const ok = await completion(task.id, task.status !== 'completed'); if (ok && $('picker-dialog').open) $('picker-dialog').close(); check.disabled = false; };
  const open = document.createElement('button'); open.type = 'button'; open.className = 'task-open';
  const title = document.createElement('strong'); title.textContent = task.title;
  const detail = document.createElement('small'); detail.textContent = `Importance ${task.importance}  ·  Urgency ${task.urgency}`;
  open.append(title, detail); open.onclick = () => { if ($('picker-dialog').open) $('picker-dialog').close(); editTask(task.id); };
  row.append(check, open); return row;
}
function render() {
  $('remove-examples').disabled = !ready || !state.tasks.some(isExampleTask);
  const active = state.tasks.filter(t => t.status === 'active');
  const focus = active.filter(t => isFocused(t, state.threshold)).sort(byCreated);
  $('active-count').textContent = `${active.length} active ${active.length === 1 ? 'task' : 'tasks'}`;
  $('active-tab-count').textContent = active.length; $('completed-count').textContent = state.tasks.length - active.length;

  $('threshold-description').textContent = state.threshold === 10 ? 'Rating 10 in both dimensions' : `Ratings ${state.threshold}–10 in both dimensions`;
  $('expand').disabled = !ready || state.threshold === 1; $('contract').disabled = !ready || state.threshold === 10;
  renderMatrix($('plot'), active, state.threshold, group => {
    if (group.length === 1) return editTask(group[0].id);
    $('picker-description').textContent = `Importance ${group[0].importance} · Urgency ${group[0].urgency} · ${group.length} tasks`;
    $('picker-list').replaceChildren(...group.map(taskRow)); $('picker-dialog').showModal();
  });
  $('focus-count').textContent = focus.length;
  $('focus-list').replaceChildren(...(focus.length ? focus.map(taskRow) : [empty('A clear field', active.length ? 'Tap + to broaden your focus, or leave space for what comes next.' : 'Add a task to start finding your focus.')]));
  $('focus-body').hidden = !state.preferences.showFocus; $('toggle-focus').textContent = state.preferences.showFocus ? 'Hide list' : 'Show list'; $('toggle-focus').setAttribute('aria-expanded', state.preferences.showFocus);
  const listed = state.tasks.filter(t => t.status === view).sort(byCreated);
  $('all-list').replaceChildren(...(listed.length ? listed.map(taskRow) : [empty(view === 'active' ? 'Start with one thing' : 'Nothing completed yet', view === 'active' ? 'Add your first task, or try example tasks below to explore the matrix.' : 'Completed tasks will stay here until you restore or delete them.')]));
  $('show-active').setAttribute('aria-pressed', view === 'active'); $('show-completed').setAttribute('aria-pressed', view === 'completed');

}
async function save(transform, message, errorTarget) {
  if (!ready) { notify('Local storage is not ready. Reload to try again.', true); return false; }
  try { state = await changeState(transform); render(); channel?.postMessage('changed'); if (message) notify(message); return true; }
  catch (error) {
    const text = `Could not save: ${error.message}. Your last saved data is unchanged.`;
    if (errorTarget) $(errorTarget).textContent = text; else notify(text, true);
    return false;
  }
}
async function completion(id, completed, errorTarget) {
  return save(current => {
    if (!current.tasks.some(t => t.id === id)) throw new Error('This task was removed in another tab');
    return { ...current, tasks: current.tasks.map(t => t.id === id ? setCompletion(t, completed) : t) };
  }, completed ? 'Task completed. Find it in Completed.' : 'Task restored to the matrix.', errorTarget);
}
function editTask(id) {
  const task = id ? state.tasks.find(t => t.id === id) : null;
  if (id && !task) return notify('This task no longer exists.', true);
  $('task-form').reset(); $('task-id').value = id || ''; $('task-dialog-title').textContent = task ? 'Task details' : 'New task';
  $('task-title').value = task?.title || ''; $('task-description').value = task?.description || '';
  for (const field of ['importance', 'urgency']) { $(field).value = task?.[field] || 5; $(`${field}-value`).textContent = $(field).value; }
  $('task-meta').textContent = task ? `${task.status === 'active' ? 'Active' : 'Completed'} · Created ${new Date(task.createdAt).toLocaleDateString()}` : 'Rate each dimension independently. You can change either later.';
  $('task-error').textContent = ''; $('delete-task').hidden = !task; $('complete-task').hidden = !task;
  $('complete-task').textContent = task?.status === 'completed' ? 'Restore task' : 'Mark completed';
  $('task-dialog').showModal(); $('task-title').focus();
}
$('add-task').onclick = () => editTask();
for (const field of ['importance', 'urgency']) $(field).oninput = () => { $(`${field}-value`).textContent = $(field).value; };
for (const button of document.querySelectorAll('[data-close]')) button.onclick = () => $(button.dataset.close).close();
$('task-form').onsubmit = async event => {
  event.preventDefault();
  const id = $('task-id').value, title = $('task-title').value.trim(), description = $('task-description').value.trim();
  const importance = Number($('importance').value), urgency = Number($('urgency').value);
  if (!title) { $('task-error').textContent = 'Enter a task title.'; $('task-title').focus(); return; }
  const button = event.submitter; button.disabled = true;
  const ok = await save(current => {
    const now = new Date().toISOString();
    if (id && !current.tasks.some(t => t.id === id)) throw new Error('This task was removed in another tab');
    const tasks = id ? current.tasks.map(t => t.id === id ? { ...t, title, description, importance, urgency, updatedAt: now } : t) : [...current.tasks, { isExample: false, id: crypto.randomUUID(), title, description, importance, urgency, status: 'active', createdAt: now, updatedAt: now, completedAt: null }];
    return { ...current, tasks };
  }, id ? 'Task saved.' : 'Task added to your matrix.', 'task-error');
  button.disabled = false; if (ok) $('task-dialog').close();
};
$('complete-task').onclick = async () => {
  const task = state.tasks.find(t => t.id === $('task-id').value); if (!task) return;
  $('complete-task').disabled = true;
  if (await completion(task.id, task.status !== 'completed', 'task-error')) $('task-dialog').close();
  $('complete-task').disabled = false;
};
$('delete-task').onclick = () => {
  pendingDelete = $('task-id').value; const task = state.tasks.find(t => t.id === pendingDelete);
  $('delete-description').textContent = task?.title || 'Selected task'; $('confirm-dialog').showModal(); $('cancel-delete').focus();
};
$('cancel-delete').onclick = () => $('confirm-dialog').close();
$('confirm-delete').onclick = async () => {
  $('confirm-delete').disabled = true;
  if (await save(current => ({ ...current, tasks: current.tasks.filter(t => t.id !== pendingDelete) }), 'Task deleted.')) { $('confirm-dialog').close(); $('task-dialog').close(); }
  $('confirm-delete').disabled = false;
};
$('expand').onclick = () => save(current => ({ ...current, threshold: clampThreshold(current.threshold - 1) }), 'Focus expanded. Task ratings are unchanged.');
$('contract').onclick = () => save(current => ({ ...current, threshold: clampThreshold(current.threshold + 1) }), 'Focus narrowed. Task ratings are unchanged.');
$('toggle-focus').onclick = () => save(current => ({ ...current, preferences: { ...current.preferences, showFocus: !current.preferences.showFocus } }));
$('show-active').onclick = () => { view = 'active'; render(); };
$('show-completed').onclick = () => { view = 'completed'; render(); };
$('export').onclick = async () => {
  try {
    const latest = await readState();
    const blob = new Blob([JSON.stringify({ ...latest, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = `focus-field-${new Date().toISOString().slice(0, 10)}.json`; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000); notify(`Export prepared with ${latest.tasks.length} tasks. Check your browser’s downloads or save prompt.`);
  } catch (error) { notify(`Export failed: ${error.message}`, true); }
};
$('import').onclick = () => { $('import-file').value = ''; $('import-file').click(); };
function previewImport() {
  if (!pendingImport) return;
  const mode = new FormData($('import-form')).get('import-mode');
  const { result } = applyImport(state, pendingImport, mode);
  const matches = pendingImport.tasks.filter(t => state.tasks.some(local => local.id === t.id)).length;
  $('import-preview').textContent = mode === 'replace' ? `Replace ${state.tasks.length} local tasks with ${pendingImport.tasks.length} imported tasks. Set threshold to ${pendingImport.threshold}.` : `${result.added} new · ${result.updated} newer imported records will replace local records · ${result.kept} local records kept. ${matches} matching IDs. Threshold stays ${state.threshold}.`;
}
$('import-file').onchange = async () => {
  const file = $('import-file').files[0]; if (!file) return;
  try {
    if (file.size > 25 * 1024 * 1024) throw new Error('Choose a JSON file smaller than 25 MB.');
    pendingImport = validateState(JSON.parse(await file.text())); state = await readState();
    $('import-form').reset(); $('import-error').textContent = '';
    $('import-summary').textContent = `${file.name}: ${pendingImport.tasks.length} validated tasks. Choose how to apply them.`;
    previewImport(); $('import-dialog').showModal();
  } catch (error) { pendingImport = null; notify(`Import rejected: ${error.message}. Existing data is unchanged.`, true); }
};
$('import-form').onchange = previewImport;
$('import-form').onsubmit = async event => {
  event.preventDefault(); if (!pendingImport) return;
  const mode = new FormData($('import-form')).get('import-mode'), button = event.submitter;
  button.disabled = true; let result;
  const ok = await save(current => { const applied = applyImport(current, pendingImport, mode); result = applied.result; return applied.state; }, '', 'import-error');
  button.disabled = false;
  if (ok) { $('import-dialog').close(); pendingImport = null; notify(mode === 'replace' ? `Import complete: replaced local data with ${result.added} tasks.` : `Import complete: ${result.added} added, ${result.updated} updated, ${result.kept} local records kept.`); }
};
$('load-example').onclick = () => save(current => ({
  ...current,
  tasks: [...current.tasks, ...createExampleTasks(current.tasks)]
}), '10 example tasks added. Tap points or task titles to explore.');
let exampleRemovalIds = new Set();
$('remove-examples').onclick = () => {
  exampleRemovalIds = new Set(state.tasks.filter(isExampleTask).map(task => task.id));
  $('remove-examples-summary').textContent = `Remove ${exampleRemovalIds.size} example tasks from this device? This cannot be undone.`;
  $('remove-examples-error').textContent = '';
  $('remove-examples-dialog').showModal();
  $('cancel-remove-examples').focus();
};
$('confirm-remove-examples').onclick = async () => {
  $('confirm-remove-examples').disabled = true;
  let removed = 0;
  const ok = await save(current => {
    const tasks = current.tasks.filter(task => !(exampleRemovalIds.has(task.id) && isExampleTask(task)));
    removed = current.tasks.length - tasks.length;
    return { ...current, tasks };
  }, '', 'remove-examples-error');
  $('confirm-remove-examples').disabled = false;
  if (ok) { $('remove-examples-dialog').close(); notify(`${removed} example tasks removed. Your own tasks were kept.`); }
};
$('help').onclick = () => $('help-dialog').showModal();
for (let i = 1; i <= 10; i++) {
  const x = document.createElement('span'); x.textContent = i; $('x-ticks').append(x);
  const y = document.createElement('span'); y.textContent = 11 - i; $('y-ticks').append(y);
}
async function refresh() { if (!ready) return; try { state = await readState(); render(); if ($('import-dialog').open) previewImport(); } catch (error) { notify(error.message, true); } }
if (channel) channel.onmessage = refresh;
window.addEventListener('focus', refresh);
async function setupOffline() {
  if (!('serviceWorker' in navigator)) { $('offline-status').textContent = 'Offline caching is unavailable in this browser.'; return; }
  try {
    const registration = await navigator.serviceWorker.register('./sw.js');
    const showUpdate = () => { if (registration.waiting && navigator.serviceWorker.controller) $('update').hidden = false; };
    showUpdate(); registration.addEventListener('updatefound', () => registration.installing?.addEventListener('statechange', showUpdate));
    $('update').onclick = () => {
      if ($('task-dialog').open || $('import-dialog').open) { notify('Finish or close your open form before updating.'); return; }
      registration.waiting?.postMessage({ type: 'ACTIVATE_UPDATE' });
    };
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!$('update').hidden && !reloading) { reloading = true; location.reload(); } });
    await navigator.serviceWorker.ready;
    $('offline-status').textContent = 'Ready offline · Export a backup whenever you need.';
  } catch (error) { $('offline-status').textContent = 'Offline setup failed. Keep this page online and reload to retry.'; }
}
let installPrompt;
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; $('install').hidden = false; });
$('install').onclick = async () => { if (installPrompt) { await installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; $('install').hidden = true; } };
window.addEventListener('appinstalled', () => { $('install').hidden = true; });
try {
  await openStorage(); state = await readState(); ready = true;
  for (const id of ['add-task', 'export', 'import', 'load-example']) $(id).disabled = false;
  render(); notify(state.tasks.length ? 'Your workspace is saved on this device.' : 'Start with a task of your own, or try the example tasks below.'); setupOffline();
} catch (error) { render(); notify(`Local storage could not be opened: ${error.message}. Reload or use a browser with IndexedDB enabled.`, true); $('offline-status').textContent = 'Storage unavailable.'; }





