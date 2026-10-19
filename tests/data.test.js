import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, isFocused, quadrant, boundaryPercent, ratingPercent, clampThreshold, pointOffsets, validateState, applyImport, setCompletion } from '../data.js';
const date = '2026-10-19T12:00:00.000Z';
const task = (overrides = {}) => ({ id: 'one', title: 'Repair', description: '', importance: 5, urgency: 5, status: 'active', createdAt: date, updatedAt: date, completedAt: null, ...overrides });
const dataset = tasks => ({ ...initialState(), tasks });
test('all 100 rating pairs classify correctly at every threshold without mutation', () => {
  for (let threshold = 1; threshold <= 10; threshold++) for (let importance = 1; importance <= 10; importance++) for (let urgency = 1; urgency <= 10; urgency++) {
    const item = task({ importance, urgency }); const original = structuredClone(item);
    assert.equal(isFocused(item, threshold), importance >= threshold && urgency >= threshold);
    assert.equal(quadrant(item, threshold), `${importance >= threshold ? 'high' : 'low'}-${urgency >= threshold ? 'high' : 'low'}`);
    assert.deepEqual(item, original);
  }
});
test('threshold starts at 5, clamps at 1 and 10, and boundaries precede rating bands', () => {
  assert.equal(initialState().threshold, 5); assert.equal(clampThreshold(0), 1); assert.equal(clampThreshold(11), 10);
  for (let value = 1; value <= 10; value++) assert.equal(boundaryPercent(value), ratingPercent(value) - 5);
});
test('jitter remains within the correct band and quadrant for all ratings and thresholds', () => {
  for (let count = 1; count <= 30; count++) for (let rating = 1; rating <= 10; rating++) for (let threshold = 1; threshold <= 10; threshold++) {
    for (const offset of pointOffsets(count)) for (const axis of ['x','y']) {
      const position = ratingPercent(rating) + offset[axis] * 10;
      assert.ok(position > (rating - 1) * 10 && position < rating * 10);
      assert.equal(position >= boundaryPercent(threshold), rating >= threshold);
    }
  }
  assert.equal(new Set(pointOffsets(8).map(p => `${p.x},${p.y}`)).size, 8);
});
test('completion excludes a task from focus, restore clears completion timestamp', () => {
  const done = setCompletion(task(), true, '2026-10-20T12:00:00.000Z');
  assert.equal(isFocused(done, 1), false); assert.equal(done.completedAt, done.updatedAt);
  const restored = setCompletion(done, false, '2026-10-21T12:00:00.000Z');
  assert.equal(restored.completedAt, null); assert.equal(isFocused(restored, 5), true); validateState(dataset([restored]));
});
test('JSON round trip preserves complete state', () => {
  const original = { ...dataset([task(), setCompletion(task({ id: 'two' }), true, date)]), threshold: 10, preferences: { showFocus: false } };
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(original))), original);
});
test('invalid imports reject ratings, timestamps, duplicates, formats and missing fields', () => {
  const invalid = [null, {}, { ...initialState(), schemaVersion: 99 }, { ...initialState(), threshold: 5.5 }, dataset([task({ importance: 0 })]), dataset([task({ urgency: 11 })]), dataset([task({ title: '  ' })]), dataset([task({ createdAt: 'yesterday' })]), dataset([task({ completedAt: date })]), dataset([task({ status: 'completed' })]), dataset([task(), task()]), dataset([task({ updatedAt: '2026-02-30T12:00:00.000Z' })])];
  for (const data of invalid) assert.throws(() => validateState(data));
});
test('merge adds by ID, newer records win, ties keep local, settings remain local', () => {
  const current = { ...dataset([task(), task({ id: 'two' }), task({ id: 'three' })]), threshold: 8 };
  const imported = dataset([task({ title: 'Newer', updatedAt: '2026-10-20T12:00:00.000Z' }), task({ id: 'two', title: 'Tie loses' }), task({ id: 'four' })]);
  const original = structuredClone(current);
  const { state, result } = applyImport(current, imported, 'merge');
  assert.deepEqual(result, { added: 1, updated: 1, kept: 1 }); assert.equal(state.tasks.length, 4);
  assert.equal(state.tasks.find(t => t.id === 'one').title, 'Newer'); assert.equal(state.tasks.find(t => t.id === 'two').title, 'Repair'); assert.equal(state.threshold, 8); assert.deepEqual(current, original);
});
test('replace uses imported state; invalid imports cannot mutate existing data', () => {
  const current = dataset([task()]); const original = structuredClone(current);
  assert.deepEqual(applyImport(current, initialState(), 'replace').state, initialState());
  assert.throws(() => applyImport(current, dataset([task({ urgency: 0 })]), 'merge')); assert.deepEqual(current, original);
});

test('example batches append ten unique tasks without changing an existing dataset', async () => {
  const { createExampleTasks } = await import('../data.js');
  const existing = [task({ title: 'My real task' }), task({ id: 'completed-example', title: 'Fix the leaking kitchen tap', status: 'completed', completedAt: date })];
  const original = structuredClone(existing);
  let tasks = [...existing];
  for (let batch = 0; batch < 4; batch++) {
    const added = createExampleTasks(tasks, date);
    assert.equal(added.length, 10);
    assert.ok(added.every(item => item.status === 'active'));
    tasks = [...tasks, ...added];
    validateState(dataset(tasks));
  }
  assert.equal(tasks.length, 42);
  assert.equal(new Set(tasks.map(item => item.id)).size, 42);
  assert.equal(new Set(tasks.map(item => item.title)).size, 42);
  assert.deepEqual(existing, original);
});

test('example cleanup identifies new and legacy examples while preserving personal tasks', async () => {
  const { createExampleTasks, isExampleTask } = await import('../data.js');
  const generated = createExampleTasks([], date);
  const edited = setCompletion({ ...generated[0], title: 'Edited example', description: 'Changed description' }, true, date);
  const personal = task({ id: 'personal', isExample: false, title: generated[1].title, description: generated[1].description });
  const legacy = task({ id: 'legacy', title: generated[2].title, description: generated[2].description });
  const ordinary = task({ id: 'ordinary', title: generated[3].title });
  const state = validateState(JSON.parse(JSON.stringify(dataset([edited, personal, legacy, ordinary]))));
  assert.deepEqual(state.tasks.filter(isExampleTask).map(item => item.id), [edited.id, 'legacy']);
  assert.deepEqual(state.tasks.filter(item => !isExampleTask(item)).map(item => item.id), ['personal', 'ordinary']);
  assert.equal(isExampleTask(task({ title: 'Sort spare cables (example 2)', description: generated[0].description })), true);
  assert.throws(() => validateState(dataset([task({ isExample: 'true' })])));
});
