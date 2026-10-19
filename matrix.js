import { boundaryPercent, ratingPercent, pointOffsets, quadrant, byCreated } from './data.js';
export function renderMatrix(plot, tasks, threshold, select) {
  plot.replaceChildren();
  const edge = boundaryPercent(threshold);
  plot.style.setProperty('--edge', `${edge}%`);
  const regions = [
    ['high-low', 0, 0, edge, 100 - edge], ['high-high', edge, 0, 100 - edge, 100 - edge],
    ['low-low', 0, 100 - edge, edge, edge], ['low-high', edge, 100 - edge, 100 - edge, edge]
  ];
  for (const [name, left, top, width, height] of regions) {
    const region = document.createElement('div'); region.className = `region ${name}`;
    Object.assign(region.style, { left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` });
    plot.append(region);
  }
  for (const axis of ['horizontal', 'vertical']) {
    const line = document.createElement('div'); line.className = `boundary ${axis}`; plot.append(line);
  }
  const groups = new Map();
  for (const task of tasks.filter(t => t.status === 'active').sort(byCreated)) {
    const key = `${task.importance},${task.urgency}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(task);
  }
  for (const group of groups.values()) {
    const task = group[0];
    const cell = document.createElement('button');
    cell.type = 'button'; cell.className = `point-cell ${quadrant(task, threshold)}`;
    cell.style.left = `${ratingPercent(task.urgency)}%`;
    cell.style.bottom = `${ratingPercent(task.importance)}%`;
    cell.setAttribute('aria-label', group.length === 1 ? `${task.title}. Importance ${task.importance}, urgency ${task.urgency}. ${task.status}.` : `${group.length} tasks. Importance ${task.importance}, urgency ${task.urgency}. Open task picker.`);
    cell.title = group.map(t => t.title).join('\n');
    for (const offset of pointOffsets(group.length)) {
      const dot = document.createElement('span'); dot.className = 'dot';
      dot.style.left = `${50 + offset.x * 100}%`; dot.style.top = `${50 + offset.y * 100}%`; cell.append(dot);
    }
    if (group.length > 8) {
      const count = document.createElement('span'); count.className = 'cluster-count'; count.textContent = group.length; cell.append(count);
    }
    cell.onclick = () => select(group); plot.append(cell);
  }
}
