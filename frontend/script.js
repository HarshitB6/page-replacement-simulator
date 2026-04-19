'use strict';

// ══════════════════════════════════════════════
//  ALGORITHM IMPLEMENTATIONS (pure JS — no backend needed in demo)
// ══════════════════════════════════════════════

function runFIFO(pages, capacity) {
  const frames = new Array(capacity).fill(-1);
  const queue  = [];
  const steps  = [];
  let faults = 0, hits = 0;

  for (const page of pages) {
    const found = frames.includes(page);
    const s = { page, hit: found, replaced: -1, reason: '', frames: [] };

    if (found) {
      hits++;
      s.reason = `Page ${page} already in memory — HIT`;
    } else {
      faults++;
      if (queue.length < capacity) {
        const idx = frames.indexOf(-1);
        frames[idx] = page;
        queue.push(page);
        s.reason = `Empty slot available — loaded page ${page}`;
      } else {
        const old = queue.shift();
        const idx = frames.indexOf(old);
        s.replaced = old;
        frames[idx] = page;
        queue.push(page);
        s.reason = `Page ${old} was loaded first (oldest in queue) — replaced by ${page}`;
      }
    }
    s.frames = [...frames];
    steps.push(s);
  }

  const total = pages.length;
  return { algorithm: 'FIFO', steps, faults, hits,
           hitRatio: hits/total, faultRatio: faults/total };
}

function runLRU(pages, capacity) {
  let frames  = [];
  const lastUsed = {};
  const steps = [];
  let faults = 0, hits = 0;

  for (let i = 0; i < pages.length; i++) {
    const page  = pages[i];
    const found = frames.includes(page);
    const s = { page, hit: found, replaced: -1, reason: '', frames: [] };

    if (found) {
      hits++;
      s.reason = `Page ${page} already in memory — HIT`;
    } else {
      faults++;
      if (frames.length < capacity) {
        frames.push(page);
        s.reason = `Empty slot available — loaded page ${page}`;
      } else {
        let lruPage = frames[0], minTime = lastUsed[frames[0]] ?? 0;
        for (const f of frames) {
          const t = lastUsed[f] ?? 0;
          if (t < minTime) { minTime = t; lruPage = f; }
        }
        const idx = frames.indexOf(lruPage);
        s.replaced = lruPage;
        frames[idx] = page;
        s.reason = `Page ${lruPage} was least recently used (step ${minTime+1}) — replaced by ${page}`;
      }
    }
    lastUsed[page] = i;
    const temp = [...frames];
    while (temp.length < capacity) temp.push(-1);
    s.frames = temp;
    steps.push(s);
  }

  const total = pages.length;
  return { algorithm: 'LRU', steps, faults, hits,
           hitRatio: hits/total, faultRatio: faults/total };
}

function runOptimal(pages, capacity) {
  let frames = [];
  const steps = [];
  let faults = 0, hits = 0;

  for (let i = 0; i < pages.length; i++) {
    const page  = pages[i];
    const found = frames.includes(page);
    const s = { page, hit: found, replaced: -1, reason: '', frames: [] };

    if (found) {
      hits++;
      s.reason = `Page ${page} already in memory — HIT`;
    } else {
      faults++;
      if (frames.length < capacity) {
        frames.push(page);
        s.reason = `Empty slot available — loaded page ${page}`;
      } else {
        let farthestIdx = -1, farthestDist = -1;
        for (let j = 0; j < frames.length; j++) {
          const nextUse = pages.indexOf(frames[j], i + 1);
          const dist    = nextUse === -1 ? Infinity : nextUse;
          if (dist > farthestDist) { farthestDist = dist; farthestIdx = j; }
        }
        const old = frames[farthestIdx];
        s.replaced = old;
        const whenStr = farthestDist === Infinity
          ? 'never used again'
          : `next used at step ${farthestDist + 1}`;
        s.reason = `Page ${old} is ${whenStr} (farthest future) — replaced by ${page}`;
        frames[farthestIdx] = page;
      }
    }
    const temp = [...frames];
    while (temp.length < capacity) temp.push(-1);
    s.frames = temp;
    steps.push(s);
  }

  const total = pages.length;
  return { algorithm: 'Optimal', steps, faults, hits,
           hitRatio: hits/total, faultRatio: faults/total };
}

function runLFU(pages, capacity) {
  let frames = [];
  const freq     = {};
  const lastUsed = {};
  const steps = [];
  let faults = 0, hits = 0;

  for (let i = 0; i < pages.length; i++) {
    const page  = pages[i];
    const found = frames.includes(page);
    const s = { page, hit: found, replaced: -1, reason: '', frames: [] };

    if (found) {
      hits++;
      freq[page] = (freq[page] || 0) + 1;
      lastUsed[page] = i;
      s.reason = `Page ${page} already in memory — HIT (freq=${freq[page]})`;
    } else {
      faults++;
      if (frames.length < capacity) {
        frames.push(page);
        freq[page] = 1;
        lastUsed[page] = i;
        s.reason = `Empty slot available — loaded page ${page} (freq=1)`;
      } else {
        let lfuPage = frames[0];
        let minFreq = freq[frames[0]] ?? 0;
        let minTime = lastUsed[frames[0]] ?? 0;
        for (const f of frames) {
          const fq = freq[f] ?? 0;
          const lt = lastUsed[f] ?? 0;
          if (fq < minFreq || (fq === minFreq && lt < minTime)) {
            minFreq = fq; minTime = lt; lfuPage = f;
          }
        }
        const idx = frames.indexOf(lfuPage);
        s.replaced = lfuPage;
        s.reason = `Page ${lfuPage} had lowest frequency (${minFreq}) — replaced by ${page}`;
        frames[idx] = page;
        delete freq[lfuPage];
        delete lastUsed[lfuPage];
        freq[page] = 1;
        lastUsed[page] = i;
      }
    }
    const temp = [...frames];
    while (temp.length < capacity) temp.push(-1);
    s.frames = temp;
    steps.push(s);
  }

  const total = pages.length;
  return { algorithm: 'LFU', steps, faults, hits,
           hitRatio: hits/total, faultRatio: faults/total };
}

// Frame-count analysis
function analyzeFrames(pages, maxFrames) {
  const fifoFaults = [], lruFaults = [], optFaults = [];
  for (let f = 1; f <= maxFrames; f++) {
    fifoFaults.push({ frames: f, faults: runFIFO(pages, f).faults });
    lruFaults.push ({ frames: f, faults: runLRU(pages, f).faults });
    optFaults.push ({ frames: f, faults: runOptimal(pages, f).faults });
  }
  return { fifoFaults, lruFaults, optFaults };
}

function detectBelady(fifoData) {
  for (let i = 1; i < fifoData.length; i++) {
    if (fifoData[i].faults > fifoData[i-1].faults) return true;
  }
  return false;
}

// ══════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════
let simData    = null;   // { input, results, analysis }
let algoIndex  = 0;
let curStep    = 0;
let playTimer  = null;
let faultChart = null;
let hitChart   = null;
let logState   = { algoIndex: -1, renderedUntil: -1 };
let frameViewMode = 'blocks';

// ══════════════════════════════════════════════
//  DOM refs
// ══════════════════════════════════════════════
const $ = id => document.getElementById(id);

// ══════════════════════════════════════════════
//  INPUT PARSING
// ══════════════════════════════════════════════
function parsePages(str) {
  return str.trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n) && n > 0);
}

// ══════════════════════════════════════════════
//  SIMULATION RUNNER
// ══════════════════════════════════════════════
function runSimulation() {
  const raw      = $('pageInput').value;
  const capacity = parseInt($('frameDisplay').textContent);
  const pages    = parsePages(raw);

  const errEl = $('errorMsg');
  if (pages.length === 0) { errEl.textContent = '⚠ Enter a valid page reference string.'; return; }
  if (pages.length > 50)  { errEl.textContent = '⚠ Maximum 50 pages allowed.'; return; }
  errEl.textContent = '';

  // Run all 4 algorithms
  const results = [
    runFIFO(pages, capacity),
    runLRU(pages, capacity),
    runOptimal(pages, capacity),
    runLFU(pages, capacity),
  ];

  // Analysis
  const maxFrames = Math.min(capacity + 5, 10);
  const analysis  = analyzeFrames(pages, maxFrames);
  analysis.beladyAnomaly = detectBelady(analysis.fifoFaults);

  simData = { input: { pages, capacity }, results, analysis };
  curStep = 0;
  stopPlay();

  buildPageTrack(pages);
  updateTimelineMax(pages.length - 1);
  resetExecutionLog();
  renderStep();
  renderMetrics();
  renderComparison();
  renderSideBySide();
  drawCharts();
  renderBelady();
}

// ══════════════════════════════════════════════
//  STEP RENDERING
// ══════════════════════════════════════════════
function renderStep() {
  if (!simData) return;
  const result = simData.results[algoIndex];
  const step   = result.steps[curStep];
  const total  = result.steps.length;

  // Status bar
  $('curPage').textContent = step.page;
  const badge = $('statusBadge');
  badge.textContent = step.hit ? 'HIT ✅' : 'FAULT ❌';
  badge.className   = 'status-badge ' + (step.hit ? 'hit' : 'fault');
  $('statusReason').textContent = step.reason;

  renderFrameView(result, step);

  // Timeline + counter
  $('timelineSlider').value = curStep;
  $('stepCounter').textContent = `${curStep+1} / ${total}`;

  // Page track highlight
  document.querySelectorAll('.pt-cell').forEach((el, i) => {
    el.className = 'pt-cell';
    if (i === curStep) el.classList.add('current');
    else if (i < curStep) {
      const s = simData.results[algoIndex].steps[i];
      el.classList.add(s.hit ? 'past-hit' : 'past-fault');
    }
  });

  syncExecutionLog(result, total);
}

function renderFrameView(result, step) {
  const container = $('framesContainer');
  container.innerHTML = '';

  if (frameViewMode === 'table') {
    renderFrameTable(container, step);
  } else if (frameViewMode === 'matrix') {
    renderFrameMatrix(container, result);
  } else {
    renderFrameBlocks(container, result, step);
  }
}

function renderFrameBlocks(container, result, step) {
  step.frames.forEach((f, i) => {
    const div = document.createElement('div');
    div.className = 'frame-block';
    if (f === -1) {
      div.classList.add('empty');
      div.textContent = '-';
    } else {
      div.textContent = f;
      if (!step.hit && f === step.page) {
        div.classList.add('active-fault');
      } else if (step.hit && f === step.page) {
        div.classList.add('active-hit');
      }
      if (step.replaced !== -1 && step.replaced === result.steps[curStep > 0 ? curStep-1 : 0]?.frames[i] && f === step.page) {
        div.classList.add('replaced');
      }
    }

    const label = document.createElement('div');
    label.style.cssText = 'position:absolute;bottom:-20px;left:0;right:0;text-align:center;font-size:.65rem;color:var(--text3);font-family:var(--font-mono)';
    label.textContent = `F${i+1}`;
    div.style.position = 'relative';
    div.appendChild(label);
    container.appendChild(div);
  });
}

function renderFrameTable(container, step) {
  const wrap = document.createElement('div');
  wrap.className = 'frame-table-wrap';

  const rows = step.frames.map((f, i) => {
    const isCurrentPage = f === step.page;
    const valueClass = isCurrentPage ? (step.hit ? 'hit-value' : 'fault-value') : '';
    const status = f === -1 ? 'Empty' : (isCurrentPage ? (step.hit ? 'Hit' : 'Loaded') : 'Resident');
    return `
      <tr>
        <th>F${i + 1}</th>
        <td class="${valueClass}">${f === -1 ? '-' : f}</td>
        <td>${status}</td>
      </tr>
    `;
  }).join('');

  wrap.innerHTML = `
    <table class="frame-table">
      <thead>
        <tr>
          <th>Frame</th>
          <th>Value</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
  container.appendChild(wrap);
}

function renderFrameMatrix(container, result) {
  const wrap = document.createElement('div');
  wrap.className = 'frame-matrix-wrap';
  const capacity = simData.input.capacity;
  const currentStep = result.steps[curStep];

  const headCells = result.steps.map((step, i) => {
    const revealed = i <= curStep;
    const classes = [
      i === curStep ? 'current-step' : '',
      revealed ? (step.hit ? 'hit-step' : 'fault-step') : 'pending-step'
    ].filter(Boolean).join(' ');
    return `
      <th class="${classes}" data-step="${i}">
        <span class="matrix-step-no">${i + 1}</span>
        <strong>${revealed ? `P${step.page}` : '-'}</strong>
      </th>
    `;
  }).join('');

  const statusCells = result.steps.map((step, i) => {
    const revealed = i <= curStep;
    const classes = [
      'matrix-status-cell',
      i === curStep ? 'current-step' : '',
      revealed ? (step.hit ? 'hit-step' : 'fault-step') : 'pending-step'
    ].filter(Boolean).join(' ');
    return `<td class="${classes}">${revealed ? (step.hit ? 'Hit' : 'Fault') : '-'}</td>`;
  }).join('');

  let bodyRows = '';
  for (let frameIndex = 0; frameIndex < capacity; frameIndex++) {
    const cells = result.steps.map((step, stepIndex) => {
      const revealed = stepIndex <= curStep;
      const value = step.frames[frameIndex];
      const previousValue = stepIndex > 0 ? result.steps[stepIndex - 1].frames[frameIndex] : -1;
      const isCurrentStep = stepIndex === curStep;
      const isCurrentPage = value === step.page;
      const classes = [];
      if (!revealed) classes.push('pending-cell');
      if (isCurrentStep) classes.push('current-step');
      if (revealed && value === -1) classes.push('is-empty');
      if (revealed && value !== previousValue && value !== -1) classes.push('changed-cell');
      if (revealed && isCurrentStep && isCurrentPage) classes.push(step.hit ? 'hit-value' : 'fault-value', 'touched-cell');
      else if (isCurrentStep) classes.push('current-value');
      return `
        <td class="${classes.join(' ')}" data-step="${stepIndex}">
          <span>${revealed ? (value === -1 ? '-' : value) : ''}</span>
        </td>
      `;
    }).join('');
    bodyRows += `<tr><th class="matrix-frame-head">F${frameIndex + 1}</th>${cells}</tr>`;
  }

  wrap.innerHTML = `
    <div class="matrix-summary">
      <div>
        <span>Current request</span>
        <strong>Step ${curStep + 1} / ${result.steps.length} · Page ${currentStep.page}</strong>
      </div>
      <div class="matrix-badge ${currentStep.hit ? 'hit' : 'fault'}">${currentStep.hit ? 'Hit' : 'Fault'}</div>
    </div>
    <div class="matrix-legend">
      <span><i class="legend-current"></i>Current step</span>
      <span><i class="legend-changed"></i>Changed frame</span>
      <span><i class="legend-hit"></i>Hit</span>
      <span><i class="legend-fault"></i>Fault</span>
    </div>
    <div class="matrix-scroll">
      <table class="frame-matrix">
        <thead><tr><th class="matrix-corner">Frame</th>${headCells}</tr></thead>
        <tbody>
          <tr><th class="matrix-frame-head">Result</th>${statusCells}</tr>
          ${bodyRows}
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(wrap);

  requestAnimationFrame(() => {
    const scrollBox = wrap.querySelector('.matrix-scroll');
    const activeCell = wrap.querySelector(`th[data-step="${curStep}"]`);
    if (!scrollBox || !activeCell) return;

    const targetLeft = activeCell.offsetLeft - (scrollBox.clientWidth / 2) + (activeCell.offsetWidth / 2);
    scrollBox.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
  });
}

function renderMetrics() {
  if (!simData) return;
  const r = simData.results[algoIndex];
  const total = simData.input.pages.length;
  $('mTotal').textContent     = total;
  $('mFaults').textContent    = r.faults;
  $('mHits').textContent      = r.hits;
  $('mHitRatio').textContent  = (r.hitRatio * 100).toFixed(1) + '%';
  $('mFaultRatio').textContent = (r.faultRatio * 100).toFixed(1) + '%';
}

// Execution log
function resetExecutionLog(message = '') {
  const log = $('executionLog');
  if (!log) return;
  log.innerHTML = '';
  logState = { algoIndex, renderedUntil: -1 };
  log.dataset.algo = '';
  log.closest('.execution-log-wrap')?.removeAttribute('data-algo');

  if (message) {
    const empty = document.createElement('div');
    empty.className = 'log-empty';
    empty.id = 'logEmpty';
    empty.textContent = message;
    log.appendChild(empty);
  }

  const chip = $('executionLogChip');
  if (chip) chip.textContent = message ? 'Awaiting run' : 'Streaming';
  updateExecutionLogHud(null, 0, 0);
}

function syncExecutionLog(result, total) {
  const log = $('executionLog');
  if (!log) return;

  if (logState.algoIndex !== algoIndex) {
    resetExecutionLog();
  }

  const empty = $('logEmpty');
  if (empty) empty.remove();

  log.dataset.algo = result.algorithm.toLowerCase();
  log.closest('.execution-log-wrap')?.setAttribute('data-algo', result.algorithm.toLowerCase());

  for (let i = logState.renderedUntil + 1; i <= curStep; i++) {
    appendExecutionLogStep(result.steps[i], i, result.steps);
  }
  logState.renderedUntil = Math.max(logState.renderedUntil, curStep);

  let activeRow = null;
  log.querySelectorAll('.log-step').forEach(row => {
    const index = parseInt(row.dataset.step);
    const isFuture = index > curStep;
    const isActive = index === curStep;
    const wasActive = row.classList.contains('active');
    row.classList.toggle('is-hidden', isFuture);
    row.classList.toggle('active', isActive);
    row.setAttribute('aria-current', isActive ? 'step' : 'false');
    if (isActive) {
      if (!wasActive) replayLogStepEffects(row);
      activeRow = row;
    }
  });

  const chip = $('executionLogChip');
  if (chip) chip.textContent = `${result.algorithm} trace | ${curStep + 1}/${total}`;
  updateExecutionLogHud(result, curStep, total);

  if (activeRow) {
    requestAnimationFrame(() => {
      const top = activeRow.offsetTop - (log.clientHeight / 2) + (activeRow.offsetHeight / 2);
      log.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    });
  }
}

function appendExecutionLogStep(step, index, steps) {
  const log = $('executionLog');
  if (!log || !step) return;

  const touchedIndex = Math.max(0, getTouchedFrameIndex(step, index, steps));
  const traceAction = getTraceAction(step, index, steps, touchedIndex);
  const row = document.createElement('div');
  row.className = `log-step ${step.hit ? 'is-hit' : 'is-fault'}`;
  row.dataset.step = index;
  row.dataset.reason = step.reason;
  row.dataset.action = traceAction.label;
  row.title = step.reason;
  row.setAttribute('role', 'button');
  row.setAttribute('tabindex', '0');
  row.setAttribute(
    'aria-label',
    `Jump to step ${index + 1}. Page ${step.page}. ${step.hit ? 'Hit' : 'Fault'}. ${step.reason}`
  );
  row.addEventListener('click', () => jumpToStep(index));
  row.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      jumpToStep(index);
    }
  });

  const marker = document.createElement('div');
  marker.className = 'log-marker';
  marker.innerHTML = `
    <span class="log-dot"></span>
    <span class="log-step-no">T+${String(index + 1).padStart(2, '0')}</span>
  `;

  const body = document.createElement('div');
  body.className = 'log-card-body';
  body.style.setProperty('--slot-index', touchedIndex + 1);

  const page = document.createElement('div');
  page.className = 'log-page';
  page.innerHTML = `
    <span>Incoming</span>
    <strong>${step.page}</strong>
    <small>req ${String(index + 1).padStart(2, '0')}</small>
  `;

  const frames = document.createElement('div');
  frames.className = 'log-frame-strip';
  step.frames.forEach((frameValue, frameIndex) => {
    frames.appendChild(createLogFrame(step, frameValue, frameIndex, touchedIndex, index, steps));
  });

  const operation = document.createElement('div');
  operation.className = `log-operation ${traceAction.kind}`;
  operation.innerHTML = `
    <span>${traceAction.label}</span>
    <strong>${traceAction.detail}</strong>
  `;

  const status = document.createElement('div');
  status.className = `log-status ${step.hit ? 'hit' : 'fault'}`;
  status.innerHTML = `
    <span class="log-status-icon">${step.hit ? '✓' : '×'}</span>
    <span>${step.hit ? 'Hit' : 'Fault'}</span>
  `;

  body.appendChild(page);
  body.appendChild(frames);
  body.appendChild(operation);
  body.appendChild(status);
  row.appendChild(marker);
  row.appendChild(body);
  log.appendChild(row);
}

function updateExecutionLogHud(result, currentIndex, total) {
  const visibleCount = result ? currentIndex + 1 : 0;
  const hitCount = result ? result.steps.slice(0, visibleCount).filter(step => step.hit).length : 0;
  const faultCount = visibleCount - hitCount;
  const pct = result && total ? ((visibleCount / total) * 100).toFixed(2) : 0;

  const visibleEl = $('logVisibleCount');
  const hitEl = $('logHitCount');
  const faultEl = $('logFaultCount');
  const fillEl = $('logProgressFill');
  if (visibleEl) visibleEl.textContent = visibleCount;
  if (hitEl) hitEl.textContent = hitCount;
  if (faultEl) faultEl.textContent = faultCount;
  if (fillEl) fillEl.style.width = `${pct}%`;
}

function getTraceAction(step, index, steps, touchedIndex) {
  if (step.hit) {
    return {
      kind: 'resident',
      label: 'RESIDENT',
      detail: `Frame F${touchedIndex + 1} matched`,
    };
  }

  if (step.replaced !== -1) {
    return {
      kind: 'evict',
      label: 'EVICT',
      detail: `${step.replaced} -> ${step.page} in F${touchedIndex + 1}`,
    };
  }

  const previous = steps[index - 1]?.frames?.[touchedIndex];
  const target = previous === -1 || previous === undefined ? `F${touchedIndex + 1}` : 'open slot';
  return {
    kind: 'load',
    label: 'LOAD',
    detail: `${step.page} -> ${target}`,
  };
}

function replayLogStepEffects(row) {
  row.querySelectorAll('.log-frame.inserted, .log-replaced-value').forEach(el => {
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
  });
}

function createLogFrame(step, frameValue, frameIndex, touchedIndex, stepIndex, steps) {
  const cell = document.createElement('div');
  cell.className = 'log-frame';
  if (frameValue === -1) cell.classList.add('empty');
  if (frameIndex === touchedIndex) {
    cell.classList.add(step.hit ? 'hit' : 'fault');
  }

  const value = document.createElement('span');
  value.className = 'log-frame-value';
  value.textContent = frameValue === -1 ? '-' : frameValue;
  cell.appendChild(value);

  const label = document.createElement('span');
  label.className = 'log-frame-label';
  label.textContent = `F${frameIndex + 1}`;
  cell.appendChild(label);

  if (!step.hit && step.replaced !== -1 && frameIndex === touchedIndex) {
    const oldValue = document.createElement('span');
    oldValue.className = 'log-replaced-value';
    oldValue.textContent = step.replaced;
    cell.appendChild(oldValue);
  }

  if (!step.hit && frameIndex === touchedIndex) {
    const prevValue = steps[stepIndex - 1]?.frames?.[frameIndex];
    if (stepIndex === 0 || prevValue !== frameValue) cell.classList.add('inserted');
  }

  return cell;
}

function getTouchedFrameIndex(step, index, steps) {
  if (step.hit) return step.frames.indexOf(step.page);

  const prevFrames = steps[index - 1]?.frames || [];
  if (step.replaced !== -1) {
    const replacedIndex = step.frames.findIndex((value, frameIndex) => (
      value === step.page && prevFrames[frameIndex] === step.replaced
    ));
    if (replacedIndex !== -1) return replacedIndex;
  }

  const insertedIndex = step.frames.findIndex((value, frameIndex) => (
    value === step.page && prevFrames[frameIndex] !== step.page
  ));
  return insertedIndex !== -1 ? insertedIndex : step.frames.indexOf(step.page);
}

function jumpToStep(index) {
  if (!simData) return;
  stopPlay();
  curStep = index;
  renderStep();
}

// ══════════════════════════════════════════════
//  PAGE TRACK
// ══════════════════════════════════════════════
function buildPageTrack(pages) {
  const track = $('pageTrack');
  track.innerHTML = '';
  pages.forEach((p, i) => {
    const cell = document.createElement('div');
    cell.className   = 'pt-cell';
    cell.textContent = p;
    cell.addEventListener('click', () => jumpToStep(i));
    track.appendChild(cell);
  });
}

// ══════════════════════════════════════════════
//  PLAYBACK
// ══════════════════════════════════════════════
function startPlay() {
  if (playTimer) return;
  const speed = parseInt($('speedSlider').value);
  $('playBtn').textContent = '⏸';
  $('playBtn').classList.add('playing');
  playTimer = setInterval(() => {
    const total = simData.results[algoIndex].steps.length;
    if (curStep < total - 1) { curStep++; renderStep(); }
    else stopPlay();
  }, speed);
}
function stopPlay() {
  if (playTimer) { clearInterval(playTimer); playTimer = null; }
  $('playBtn').textContent = '▶';
  $('playBtn').classList.remove('playing');
}
function togglePlay() {
  if (!simData) return;
  playTimer ? stopPlay() : startPlay();
}

// ══════════════════════════════════════════════
//  COMPARISON TABLE
// ══════════════════════════════════════════════
function renderComparison() {
  if (!simData) return;
  const tbody   = $('compareBody');
  tbody.innerHTML = '';
  const results = simData.results;
  const minFaults = Math.min(...results.map(r => r.faults));
  const tagClasses = ['tag-fifo','tag-lru','tag-opt','tag-lfu'];

  results.forEach((r, i) => {
    const tr = document.createElement('tr');
    if (r.faults === minFaults) tr.classList.add('winner');
    const pct = ((1 - r.faultRatio) * 100).toFixed(0);
    tr.innerHTML = `
      <td class="${tagClasses[i]}" style="font-weight:800">${r.algorithm}${r.faults===minFaults ? ' 🏆':''}</td>
      <td>${r.faults}</td>
      <td>${r.hits}</td>
      <td>${(r.hitRatio*100).toFixed(1)}%</td>
      <td>${(r.faultRatio*100).toFixed(1)}%</td>
      <td><div class="perf-bar-wrap"><div class="perf-bar" style="width:${pct}%"></div></div></td>
    `;
    tbody.appendChild(tr);
  });
}

// ══════════════════════════════════════════════
//  SIDE-BY-SIDE
// ══════════════════════════════════════════════
function renderSideBySide() {
  if (!simData) return;
  const container = $('sideBySide');
  container.innerHTML = '';
  const pages = simData.input.pages;
  const tagClasses = ['tag-fifo','tag-lru','tag-opt','tag-lfu'];

  simData.results.forEach((r, ri) => {
    const card = document.createElement('div');
    card.className = 'sbs-card';
    card.innerHTML = `<div class="sbs-algo-name ${tagClasses[ri]}">${r.algorithm}</div>`;
    const framesDiv = document.createElement('div');
    framesDiv.className = 'sbs-frames';

    // Show all steps (up to 12 for space)
    const maxShow = Math.min(r.steps.length, 12);
    for (let si = 0; si < maxShow; si++) {
      const step = r.steps[si];
      const row  = document.createElement('div');
      row.className = 'sbs-step';

      const lbl = document.createElement('div');
      lbl.className   = 'sbs-page-label';
      lbl.textContent = step.page;
      row.appendChild(lbl);

      step.frames.forEach(f => {
        const cell = document.createElement('div');
        cell.className   = 'sbs-frame-cell';
        cell.textContent = f === -1 ? '—' : f;
        if (!step.hit && f === step.page) cell.classList.add('sbs-fault');
        else if (step.hit && f === step.page) cell.classList.add('sbs-hit');
        row.appendChild(cell);
      });

      const ind = document.createElement('span');
      ind.className   = 'sbs-indicator';
      ind.textContent = step.hit ? '✅' : '❌';
      row.appendChild(ind);
      framesDiv.appendChild(row);
    }

    if (r.steps.length > 12) {
      const more = document.createElement('div');
      more.style.cssText = 'font-size:.75rem;color:var(--text3);margin-top:.4rem;font-family:var(--font-mono)';
      more.textContent = `+ ${r.steps.length - 12} more steps…`;
      framesDiv.appendChild(more);
    }

    card.appendChild(framesDiv);
    container.appendChild(card);
  });
}

// ══════════════════════════════════════════════
//  CHARTS
// ══════════════════════════════════════════════
function drawCharts() {
  if (!simData) return;
  const { fifoFaults, lruFaults, optFaults } = simData.analysis;
  const labels = fifoFaults.map(x => x.frames);

  const chartDefaults = {
    tension: 0.35,
    pointRadius: 5,
    pointHoverRadius: 7,
    borderWidth: 2,
    fill: false,
  };

  const darkBg = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#1e2233';

  // Fault chart
  if (faultChart) faultChart.destroy();
  faultChart = new Chart($('faultChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        { ...chartDefaults, label: 'FIFO',    data: fifoFaults.map(x=>x.faults), borderColor: '#5b8def', pointBackgroundColor: '#5b8def' },
        { ...chartDefaults, label: 'LRU',     data: lruFaults.map(x=>x.faults),  borderColor: '#a78bfa', pointBackgroundColor: '#a78bfa' },
        { ...chartDefaults, label: 'Optimal', data: optFaults.map(x=>x.faults),  borderColor: '#34d399', pointBackgroundColor: '#34d399' },
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#94a3b8', font: { family: 'Space Mono', size: 11 } } } },
      scales: {
        x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,.05)' }, title: { display: true, text: 'Number of Frames', color: '#64748b' } },
        y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,.05)' }, title: { display: true, text: 'Page Faults', color: '#64748b' } },
      }
    }
  });

  // Hit Ratio chart
  if (hitChart) hitChart.destroy();
  const total = simData.input.pages.length;
  hitChart = new Chart($('hitChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        { ...chartDefaults, label: 'FIFO',    data: fifoFaults.map(x=>((total-x.faults)/total*100).toFixed(1)), borderColor: '#5b8def', pointBackgroundColor: '#5b8def' },
        { ...chartDefaults, label: 'LRU',     data: lruFaults.map(x=>((total-x.faults)/total*100).toFixed(1)),  borderColor: '#a78bfa', pointBackgroundColor: '#a78bfa' },
        { ...chartDefaults, label: 'Optimal', data: optFaults.map(x=>((total-x.faults)/total*100).toFixed(1)),  borderColor: '#34d399', pointBackgroundColor: '#34d399' },
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#94a3b8', font: { family: 'Space Mono', size: 11 } } } },
      scales: {
        x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,.05)' }, title: { display: true, text: 'Number of Frames', color: '#64748b' } },
        y: { ticks: { color: '#64748b', callback: v => v+'%' }, grid: { color: 'rgba(255,255,255,.05)' }, title: { display: true, text: 'Hit Ratio (%)', color: '#64748b' } },
      }
    }
  });
}

// ══════════════════════════════════════════════
//  BELADY BANNER
// ══════════════════════════════════════════════
function renderBelady() {
  if (!simData) return;
  const banner = $('beladyBanner');
  if (simData.analysis.beladyAnomaly) {
    banner.style.display = 'flex';
    $('beladyDesc').textContent =
      `Belady's Anomaly detected in FIFO! Increasing frames from some value actually increases page faults. LRU and Optimal are immune to this anomaly.`;
  } else {
    banner.style.display = 'none';
  }
}

// ══════════════════════════════════════════════
//  TIMELINE HELPER
// ══════════════════════════════════════════════
function updateTimelineMax(max) {
  const tl = $('timelineSlider');
  tl.max   = max;
  tl.value = 0;
}

// ══════════════════════════════════════════════
//  EXPORT
// ══════════════════════════════════════════════
function exportJSON() {
  if (!simData) return;
  const blob = new Blob([JSON.stringify(simData, null, 2)], { type: 'application/json' });
  downloadBlob(blob, 'pagesim_report.json');
}

function exportCSV() {
  if (!simData) return;
  let csv = 'Algorithm,Faults,Hits,HitRatio,FaultRatio\n';
  for (const r of simData.results) {
    csv += `${r.algorithm},${r.faults},${r.hits},${r.hitRatio.toFixed(4)},${r.faultRatio.toFixed(4)}\n`;
  }
  csv += '\nStep-by-step detail\n';
  csv += 'Algorithm,Step,Page,Frames,Hit,Replaced,Reason\n';
  for (const r of simData.results) {
    r.steps.forEach((s, i) => {
      csv += `${r.algorithm},${i+1},${s.page},"${s.frames.join(' ')}",${s.hit},${s.replaced},"${s.reason}"\n`;
    });
  }
  downloadBlob(new Blob([csv], { type: 'text/csv' }), 'pagesim_report.csv');
}

function downloadBlob(blob, name) {
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ══════════════════════════════════════════════
//  EVENT WIRING
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

  document.querySelectorAll('.view-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-mode-btn').forEach(viewBtn => {
        viewBtn.classList.toggle('active', viewBtn === btn);
      });
      frameViewMode = btn.dataset.view;
      if (simData) renderStep();
    });
  });

  // Run / Reset
  $('runBtn').addEventListener('click', runSimulation);
  $('resetBtn').addEventListener('click', () => {
    $('pageInput').value = '';
    $('frameDisplay').textContent = '3';
    $('frameSlider').value = 3;
    frameViewMode = 'blocks';
    document.querySelectorAll('.view-mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === 'blocks');
    });
    simData = null; curStep = 0; stopPlay();
    $('framesContainer').innerHTML = '';
    $('pageTrack').innerHTML = '';
    resetExecutionLog('Run simulation to stream memory changes.');
    $('stepStatus').querySelector('#statusReason').textContent = 'Run simulation to begin';
    $('statusBadge').textContent = '—';
    $('curPage').textContent = '—';
    $('compareBody').innerHTML = '<tr><td colspan="6" class="empty-msg">Run a simulation to see comparison</td></tr>';
    $('sideBySide').innerHTML = '';
    if (faultChart) { faultChart.destroy(); faultChart = null; }
    if (hitChart)   { hitChart.destroy();   hitChart   = null; }
    $('beladyBanner').style.display = 'none';
    ['mTotal','mFaults','mHits','mHitRatio','mFaultRatio'].forEach(id => $(id).textContent = '—');
    $('stepCounter').textContent = '0 / 0';
    $('errorMsg').textContent = '';
  });

  // Random
  $('randomBtn').addEventListener('click', () => {
    const count = 10 + Math.floor(Math.random() * 6); // 10-15 pages
    const pages = Array.from({ length: count }, () => Math.floor(Math.random() * 7) + 1);
    $('pageInput').value = pages.join(' ');
  });

  // Sample buttons
  document.querySelectorAll('.sample-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $('pageInput').value = btn.dataset.pages;
      const f = parseInt(btn.dataset.frames);
      $('frameDisplay').textContent = f;
      $('frameSlider').value = f;
    });
  });

  // Frame +/−
  $('frameMinus').addEventListener('click', () => {
    const v = Math.max(1, parseInt($('frameDisplay').textContent) - 1);
    $('frameDisplay').textContent = v;
    $('frameSlider').value = v;
  });
  $('framePlus').addEventListener('click', () => {
    const v = Math.min(10, parseInt($('frameDisplay').textContent) + 1);
    $('frameDisplay').textContent = v;
    $('frameSlider').value = v;
  });
  $('frameSlider').addEventListener('input', e => {
    $('frameDisplay').textContent = e.target.value;
  });

  // Algo pills
  document.querySelectorAll('.algo-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.algo-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      algoIndex = parseInt(pill.dataset.algo);
      curStep = 0; stopPlay();
      if (simData) {
        resetExecutionLog();
        renderStep();
        renderMetrics();
      }
    });
  });

  // Playback
  $('playBtn').addEventListener('click', togglePlay);
  $('prevBtn').addEventListener('click', () => { if (simData && curStep > 0) { curStep--; renderStep(); } });
  $('nextBtn').addEventListener('click', () => {
    if (!simData) return;
    const total = simData.results[algoIndex].steps.length;
    if (curStep < total - 1) { curStep++; renderStep(); }
  });
  $('firstBtn').addEventListener('click', () => { if (simData) { curStep = 0; renderStep(); } });
  $('lastBtn').addEventListener('click', () => {
    if (!simData) return;
    curStep = simData.results[algoIndex].steps.length - 1;
    renderStep();
  });

  // Speed slider
  $('speedSlider').addEventListener('input', e => {
    $('speedVal').textContent = e.target.value + 'ms';
    if (playTimer) { stopPlay(); startPlay(); }  // restart with new speed
  });

  // Timeline slider
  $('timelineSlider').addEventListener('input', e => {
    if (!simData) return;
    curStep = parseInt(e.target.value);
    renderStep();
  });

  // Export
  $('exportJson').addEventListener('click', exportJSON);
  $('exportCsv').addEventListener('click', exportCSV);

  // Theme toggle
  $('themeToggle').addEventListener('click', () => {
    const html = document.documentElement;
    html.dataset.theme = html.dataset.theme === 'dark' ? 'light' : 'dark';
  });

  // Nav active state on scroll
  const sections = document.querySelectorAll('section[id]');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        document.querySelectorAll('.nav-link').forEach(l => {
          l.classList.toggle('active', l.dataset.section === e.target.id);
        });
      }
    });
  }, { threshold: 0.3 });
  sections.forEach(s => observer.observe(s));

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (['INPUT', 'SELECT', 'BUTTON'].includes(e.target.tagName)) return;
    if (e.key === 'ArrowRight') $('nextBtn').click();
    if (e.key === 'ArrowLeft')  $('prevBtn').click();
    if (e.key === ' ') { e.preventDefault(); togglePlay(); }
  });

  // Load from output.json if available (for C++ backend mode)
  tryLoadFromJSON();
});

async function tryLoadFromJSON() {
  try {
    const res = await fetch('../data/output.json');
    if (!res.ok) return;
    const json = await res.json();
    if (!json.results || !json.input) return;

    // Merge json into simData format expected by the renderer
    simData = {
      input:   json.input,
      results: json.results,
      analysis: json.analysis
    };
    // If analysis is missing frame-count data, recompute
    if (!simData.analysis?.fifoFaults) {
      const a = analyzeFrames(json.input.pages, Math.min(json.input.capacity + 5, 10));
      simData.analysis = { ...json.analysis, ...a };
    }

    algoIndex = 0; curStep = 0;
    buildPageTrack(simData.input.pages);
    updateTimelineMax(simData.results[0].steps.length - 1);
    $('pageInput').value = simData.input.pages.join(' ');
    $('frameDisplay').textContent = simData.input.capacity;
    $('frameSlider').value = simData.input.capacity;
    resetExecutionLog();
    renderStep();
    renderMetrics();
    renderComparison();
    renderSideBySide();
    drawCharts();
    renderBelady();
  } catch (e) {
    // no backend json — that's fine, JS simulation works standalone
  }
}
