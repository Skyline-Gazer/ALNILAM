export function calculateCLS(events) {
  let maximum = 0, total = 0, start, previous;
  for (const entry of [...events].sort((a, b) => a.startTime - b.startTime)) {
    if (entry.hadRecentInput) continue;
    if (!Number.isFinite(entry.value) || entry.value < 0 || !Number.isFinite(entry.startTime) || entry.startTime < 0) throw Error('Invalid LayoutShift entry');
    if (start === undefined || entry.startTime - previous > 1000 || entry.startTime - start > 5000) {
      start = entry.startTime;
      total = 0;
    }
    total += entry.value;
    previous = entry.startTime;
    maximum = Math.max(maximum, total);
  }
  return maximum;
}

export function assertCLSBudget(events, maximum = 0.10) {
  const cls = calculateCLS(events);
  if (!Number.isFinite(maximum) || maximum < 0 || cls > maximum) throw Error(`CLS regression: ${cls} exceeds ${maximum}`);
  return cls;
}

export function observeLayoutShifts() {
  window.__cnbShifts = [];
  new PerformanceObserver(list => {
    for (const entry of list.getEntries()) {
      const rect = value => value ? {x: value.x, y: value.y, width: value.width, height: value.height} : null;
      window.__cnbShifts.push({value: entry.value, startTime: entry.startTime, hadRecentInput: entry.hadRecentInput,
        url: location.href, action: window.__cnbAction || 'load',
        sources: (entry.sources || []).map(source => ({tag: source.node?.tagName, id: source.node?.id,
          previousRect: rect(source.previousRect), currentRect: rect(source.currentRect)}))});
    }
  }).observe({type: 'layout-shift', buffered: true});
}
