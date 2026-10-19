export const SCHEMA_VERSION = 1;
export const initialState = () => ({ schemaVersion: SCHEMA_VERSION, tasks: [], threshold: 5, preferences: { showFocus: true } });
export const clampThreshold = value => Math.max(1, Math.min(10, value));
export const isFocused = (task, threshold) => task.status === 'active' && task.importance >= threshold && task.urgency >= threshold;
export function quadrant(task, threshold) {
  return `${task.importance >= threshold ? 'high' : 'low'}-${task.urgency >= threshold ? 'high' : 'low'}`;
}
export const boundaryPercent = threshold => (threshold - 1) * 10;
export const ratingPercent = rating => (rating - 0.5) * 10;
export const byCreated = (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const rating = value => Number.isInteger(value) && value >= 1 && value <= 10;
const timestamp = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
export function validateState(input) {
  const fail = message => { throw new Error(message); };
  if (!plain(input) || input.schemaVersion !== SCHEMA_VERSION) fail('Unsupported file format or schema version. Use a version 1 export.');
  if (!Array.isArray(input.tasks) || input.tasks.length > 20000) fail('The file must contain an array of no more than 20,000 tasks.');
  if (!rating(input.threshold)) fail('The threshold must be a whole number from 1 to 10.');
  if (!plain(input.preferences) || typeof input.preferences.showFocus !== 'boolean') fail('The application preferences are invalid.');
  const ids = new Set();
  const tasks = input.tasks.map((task, index) => {
    const name = `Task ${index + 1}`;
    if (!plain(task) || typeof task.id !== 'string' || !task.id.trim() || task.id.length > 200 || ids.has(task.id)) fail(`${name} has a missing, invalid, or duplicate ID.`);
    ids.add(task.id);
    if (typeof task.title !== 'string' || !task.title.trim() || task.title.length > 200) fail(`${name} needs a title of 1–200 characters.`);
    if (typeof task.description !== 'string' || task.description.length > 10000) fail(`${name} has an invalid description (maximum 10,000 characters).`);
    if (!rating(task.importance) || !rating(task.urgency)) fail(`${name} ratings must be whole numbers from 1 to 10.`);
    if (!['active', 'completed'].includes(task.status)) fail(`${name} has an invalid status.`);
    if (!timestamp(task.createdAt) || !timestamp(task.updatedAt) || task.updatedAt < task.createdAt) fail(`${name} has invalid timestamps.`);
    if (task.status === 'completed' ? !timestamp(task.completedAt) || task.completedAt < task.createdAt || task.completedAt > task.updatedAt : task.completedAt !== null) fail(`${name} has an invalid completion timestamp.`);
    if (task.isExample !== undefined && typeof task.isExample !== 'boolean') fail(`Task example marker must be true or false.`);
    return { ...(task.isExample === undefined ? {} : { isExample: task.isExample }), id: task.id, title: task.title, description: task.description, importance: task.importance, urgency: task.urgency, status: task.status, createdAt: task.createdAt, updatedAt: task.updatedAt, completedAt: task.completedAt };
  });
  return { schemaVersion: SCHEMA_VERSION, tasks, threshold: input.threshold, preferences: { showFocus: input.preferences.showFocus } };
}
export function applyImport(current, imported, mode) {
  const incoming = validateState(imported);
  if (mode === 'replace') return { state: incoming, result: { added: incoming.tasks.length, updated: 0, kept: 0 } };
  if (mode !== 'merge') throw new Error('Choose Replace or Merge.');
  const records = new Map(current.tasks.map(task => [task.id, task]));
  const result = { added: 0, updated: 0, kept: 0 };
  for (const task of incoming.tasks) {
    const local = records.get(task.id);
    if (!local) { records.set(task.id, task); result.added++; }
    else if (task.updatedAt > local.updatedAt) { records.set(task.id, task); result.updated++; }
    else result.kept++;
  }
  return { state: { ...current, tasks: [...records.values()] }, result };
}
export function setCompletion(task, completed, now = new Date().toISOString()) {
  return { ...task, status: completed ? 'completed' : 'active', updatedAt: now, completedAt: completed ? now : null };
}
// Stable offsets stay within the rating band. Crowded bands open a complete task picker.
export function pointOffsets(count) {
  if (count === 1) return [{ x: 0, y: 0 }];
  return Array.from({ length: Math.min(count, 8) }, (_, i) => {
    const angle = i * Math.PI * 2 / Math.min(count, 8);
    return { x: Math.cos(angle) * 0.23, y: Math.sin(angle) * 0.23 };
  });
}

const EXAMPLE_TEMPLATES = [
    ['Fix the leaking kitchen tap', 8, 9], ['Book the annual checkup', 9, 5],
    ['Plan next month’s project', 9, 3], ['Reply to the delivery driver', 4, 9],
    ['Organize the tool shelf', 4, 3], ['Pick up repair supplies', 8, 9],
    ['Review the household budget', 7, 6], ['Replace the smoke alarm battery', 10, 10],
    ['Sort old receipts', 2, 2], ['Confirm tomorrow’s appointment', 6, 8],
    ['Patch the garden hose', 6, 7], ['Back up family photos', 9, 4],
    ['Return the borrowed ladder', 4, 7], ['Clear unused phone apps', 1, 1],
    ['Prepare for the project review', 10, 8], ['Compare insulation options', 8, 2],
    ['Collect a package before closing', 3, 10], ['Rearrange the bookshelf', 2, 4],
    ['Check the car tire pressure', 7, 7], ['Make a weekend meal plan', 5, 5],
    ['Repair the loose stair rail', 10, 9], ['Set a long-term savings target', 10, 1],
    ['Confirm the meeting room booking', 3, 8], ['Browse new desk accessories', 1, 3],
    ['Submit the reimbursement form', 7, 9], ['Learn a new repair technique', 8, 3],
    ['Arrange a courier pickup', 4, 10], ['Sort spare cables', 3, 2],
    ['Check the emergency supply kit', 9, 2], ['Clean the workshop floor', 5, 6]
  ];

export function isExampleTask(task) {
  if (typeof task.isExample === 'boolean') return task.isExample;
  const base = task.title.replace(/ \(example \d+\)$/u, '');
  return task.description === 'Example task — edit or delete it freely.' && EXAMPLE_TEMPLATES.some(([title]) => title === base);
}

export function createExampleTasks(existingTasks, now = new Date().toISOString()) {
  const examples = EXAMPLE_TEMPLATES;
  const titles = new Set(existingTasks.map(task => task.title));
  const added = [];
  for (let index = 0; added.length < 10; index++) {
    const [base] = examples[index % examples.length];
    const cycle = Math.floor(index / examples.length) + 1;
    const title = cycle === 1 ? base : `${base} (example ${cycle})`;
    if (titles.has(title)) continue;
    titles.add(title);
    const importance = Math.floor(Math.random() * 10) + 1;
    const urgency = Math.floor(Math.random() * 10) + 1;
    added.push({ isExample: true, id: crypto.randomUUID(), title, description: 'Example task — edit or delete it freely.', importance, urgency, status: 'active', createdAt: now, updatedAt: now, completedAt: null });
  }
  return added;
}


