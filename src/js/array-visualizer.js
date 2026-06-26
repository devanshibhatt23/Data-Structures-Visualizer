import { AnimationEngine } from './animation-engine.js';
import { PseudocodePanel, LogPanel } from './ui-panels.js';
import { CustomDropdown } from './custom-dropdown.js';
import { DEFAULTS, randomArray, parseIntList } from './utils.js';
import { ARRAY as PC } from './pseudocode-snippets.js';
import { setupMobileTabs, setupProgress, setupSpeedControl, setupFitToScreen } from './visualizer-base.js';

const OPERATIONS = [
  { value: 'create', label: 'Create Array', icon: '⊞' },
  { value: 'insert', label: 'Insert Element', icon: '⊕' },
  { value: 'delete', label: 'Delete Element', icon: '⊖' },
  { value: 'search', label: 'Linear Search', icon: '🔍' },
  { value: 'bubble-sort', label: 'Bubble Sort', icon: '⇅' },
];

class ArrayVisualizer {
  constructor() {
    this.array = [];
    this.container = document.getElementById('visualization-container');
    this.emptyState = document.getElementById('empty-state');
    this.inputGroup = document.getElementById('input-group');
    this.canvasArea = document.getElementById('canvas-area');
    this.progressBar = document.getElementById('step-progress');

    this.runBtn = document.getElementById('run-btn');
    this.playBtn = document.getElementById('play-btn');
    this.pauseBtn = document.getElementById('pause-btn');
    this.resetBtn = document.getElementById('reset-btn');
    this.randomBtn = document.getElementById('random-btn');
    this.speedSlider = document.getElementById('speed-slider');
    this.speedLabel = document.getElementById('speed-label');

    this.pseudocode = new PseudocodePanel('pseudocode-body');
    this.log = new LogPanel('log-body', 'clear-log-btn');

    this.dropdown = new CustomDropdown(
      document.getElementById('operation-dropdown'),
      OPERATIONS,
      () => this._updateInputs()
    );

    const progress = setupProgress(null, this.progressBar, this.canvasArea);
    this.engine = new AnimationEngine({
      onStep: (step, index) => {
        if (step.pseudocodeLine !== undefined) this.pseudocode.highlightLine(step.pseudocodeLine);
        if (step.description) this.log.addEntry(step.description, step.logType || 'info');
        const p = setupProgress(this.engine, this.progressBar, this.canvasArea);
        p.onStep(step, index);
        this._updatePlaybackControls();
      },
      onComplete: () => {
        this.log.addEntry('Operation completed.', 'success');
        this.pseudocode.clearHighlight();
        setupProgress(this.engine, this.progressBar, this.canvasArea).onComplete();
        this._updatePlaybackControls();
      },
      onReset: () => {
        setupProgress(this.engine, this.progressBar, this.canvasArea).onReset();
        this._updatePlaybackControls();
      },
    });

    setupFitToScreen(this.container, this.canvasArea, '.array-container');

    this._bindEvents();
    setupMobileTabs();
    setupSpeedControl(this.engine, this.speedSlider, this.speedLabel);
    this._updateInputs();
    this._autoInit();
  }

  _bindEvents() {
    this.runBtn.addEventListener('click', () => this.runOperation());
    this.playBtn.addEventListener('click', () => this.engine.play());
    this.pauseBtn.addEventListener('click', () => this.engine.pause());
    this.resetBtn.addEventListener('click', () => this.resetApp());
    this.randomBtn.addEventListener('click', () => this._fillRandom());
  }

  _autoInit() {
    const values = DEFAULTS.array.map(String);
    this._buildArrayInstant(values);
    this.log.addEntry(`Default array loaded: [${values.join(', ')}]`, 'info');
  }

  _fillRandom() {
    const op = this.dropdown.getValue();
    const vals = randomArray(6, 1, 50).map(String);
    if (op === 'create') {
      const input = document.getElementById('input-values');
      if (input) input.value = vals.join(', ');
      else this._generateCreateSteps(vals, true);
    } else if (op === 'insert') {
      const v = document.getElementById('input-value');
      const i = document.getElementById('input-index');
      if (v) v.value = vals[0];
      if (i) i.value = Math.floor(Math.random() * (this.array.length + 1));
    } else if (op === 'delete') {
      const i = document.getElementById('input-index');
      if (i && this.array.length) i.value = Math.floor(Math.random() * this.array.length);
    } else if (op === 'search') {
      const v = document.getElementById('input-value');
      if (v) v.value = this.array.length ? this.array[Math.floor(Math.random() * this.array.length)] : vals[0];
    } else if (op === 'bubble-sort') {
      this._generateBubbleSortSteps();
      this.engine.play();
    }
  }

  _buildArrayInstant(values) {
    this.array = [...values];
    this.renderArray();
  }

  _updatePlaybackControls() {
    const { isPlaying, hasNextStep } = this.engine;
    this.runBtn.disabled = isPlaying || hasNextStep;
    this.playBtn.disabled = !hasNextStep || isPlaying;
    this.pauseBtn.disabled = !isPlaying;
  }

  _updateInputs() {
    const op = this.dropdown.getValue();
    this.inputGroup.innerHTML = '';
    if (op === 'create') {
      const input = document.createElement('input');
      input.type = 'text'; input.id = 'input-values'; input.className = 'input-field';
      input.placeholder = 'Values (e.g. 5,12,8,3)';
      input.value = DEFAULTS.array.join(', ');
      this.inputGroup.appendChild(input);
    } else if (op === 'insert') {
      ['input-index', 'input-value'].forEach((id, i) => {
        const el = document.createElement('input');
        el.type = i === 0 ? 'number' : 'text';
        el.id = id; el.className = 'input-field narrow';
        el.placeholder = i === 0 ? 'Index' : 'Value';
        if (i === 0) el.min = '0';
        this.inputGroup.appendChild(el);
      });
    } else if (op === 'delete') {
      const el = document.createElement('input');
      el.type = 'number'; el.id = 'input-index'; el.className = 'input-field narrow';
      el.placeholder = 'Index'; el.min = '0';
      this.inputGroup.appendChild(el);
    } else if (op === 'search') {
      const el = document.createElement('input');
      el.type = 'text'; el.id = 'input-value'; el.className = 'input-field narrow';
      el.placeholder = 'Value to find';
      this.inputGroup.appendChild(el);
    }
  }

  renderArray() {
    if (!this.array.length) {
      this.container.innerHTML = '';
      this.container.appendChild(this.emptyState);
      this.emptyState.style.display = 'flex';
      return;
    }
    this.emptyState.style.display = 'none';
    this.container.innerHTML = '<div class="array-container">' +
      this.array.map((val, i) => `
        <div class="array-cell-wrapper" id="cell-wrapper-${i}">
          <div class="array-cell" id="cell-${i}">${val}</div>
          <div class="array-index">${i}</div>
        </div>`).join('') + '</div>';
  }

  resetApp() {
    this.engine.reset();
    this.array = [];
    this.renderArray();
    this.log.clear();
    this.pseudocode.reset();
    this._autoInit();
  }

  runOperation() {
    if (this.engine.hasNextStep || this.engine.isPlaying) return;
    const op = this.dropdown.getValue();

    if (op === 'create') {
      const valStr = document.getElementById('input-values')?.value || '';
      const values = parseIntList(valStr, DEFAULTS.array.map(String));
      if (!values) { this.log.addEntry('Invalid input. Use comma-separated integers.', 'error'); return; }
      this._generateCreateSteps(values);
    } else if (op === 'insert') {
      const idx = parseInt(document.getElementById('input-index').value);
      const val = document.getElementById('input-value').value;
      if (isNaN(idx) || idx < 0 || idx > this.array.length) {
        this.log.addEntry(`Invalid index. Must be 0–${this.array.length}.`, 'error'); return;
      }
      if (!val.trim()) { this.log.addEntry('Please enter a value.', 'error'); return; }
      this._generateInsertSteps(idx, val);
    } else if (op === 'delete') {
      const idx = parseInt(document.getElementById('input-index').value);
      if (!this.array.length) { this.log.addEntry('Array is empty.', 'error'); return; }
      if (isNaN(idx) || idx < 0 || idx >= this.array.length) {
        this.log.addEntry(`Invalid index. Must be 0–${this.array.length - 1}.`, 'error'); return;
      }
      this._generateDeleteSteps(idx);
    } else if (op === 'search') {
      const val = document.getElementById('input-value').value;
      if (!this.array.length) { this.log.addEntry('Array is empty.', 'error'); return; }
      if (!val.trim()) { this.log.addEntry('Enter a value to search.', 'error'); return; }
      this._generateSearchSteps(val);
    } else if (op === 'bubble-sort') {
      if (this.array.length < 2) { this.log.addEntry('Need at least 2 elements to sort.', 'error'); return; }
      this._generateBubbleSortSteps();
    }
    this.engine.play();
  }

  _generateCreateSteps(values, silent = false) {
    this.pseudocode.setCode(PC.create);
    if (!silent) { this.log.clear(); this.log.addEntry(`Creating array: [${values.join(', ')}]`, 'action'); }

    const steps = [
      { description: `n = ${values.length}`, pseudocodeLine: 0, action: async () => { this.array = []; this.renderArray(); } },
      { description: `Allocate array of size ${values.length}`, pseudocodeLine: 1, action: async () => {
        this.emptyState.style.display = 'none';
        this.container.innerHTML = '<div class="array-container"></div>';
      }},
    ];
    values.forEach((val, i) => {
      steps.push({
        description: `A[${i}] = ${val}`, pseudocodeLine: 2,
        action: async () => {
          this.array.push(val);
          const cont = this.container.querySelector('.array-container');
          const w = document.createElement('div');
          w.className = 'array-cell-wrapper'; w.id = `cell-wrapper-${i}`;
          w.innerHTML = `<div class="array-cell inserting" id="cell-${i}">${val}</div><div class="array-index">${i}</div>`;
          cont.appendChild(w);
        },
      });
    });
    steps.push({ description: 'Array creation complete.', pseudocodeLine: 3, action: async () => {
      this.container.querySelectorAll('.array-cell.inserting').forEach(el => el.classList.remove('inserting'));
    }});
    this.engine.setSteps(steps);
    this._updatePlaybackControls();
  }

  _generateSearchSteps(target) {
    this.pseudocode.setCode(PC.search);
    this.log.clear();
    this.log.addEntry(`Linear search for ${target}`, 'action');

    const steps = [];
    let found = false;
    for (let i = 0; i < this.array.length; i++) {
      steps.push({
        description: `i = ${i}: check A[${i}] = ${this.array[i]}`, pseudocodeLine: 1,
        action: async () => {
          this.renderArray();
          document.getElementById(`cell-${i}`)?.classList.add('highlight');
        },
      });
      if (String(this.array[i]) === String(target)) {
        found = true;
        steps.push({
          description: `Found ${target} at index ${i}`, pseudocodeLine: 2, logType: 'success',
          action: async () => {
            this.renderArray();
            const cell = document.getElementById(`cell-${i}`);
            if (cell) { cell.classList.add('found'); cell.classList.remove('highlight'); }
          },
        });
        break;
      }
      steps.push({
        description: `${this.array[i]} ≠ ${target}, i++`, pseudocodeLine: 1,
        action: async () => { document.getElementById(`cell-${i}`)?.classList.remove('highlight'); },
      });
    }
    if (!found) {
      steps.push({ description: `${target} not found — return -1`, pseudocodeLine: 3, logType: 'error', action: async () => {} });
    }
    this.engine.setSteps(steps);
    this._updatePlaybackControls();
  }

  _generateBubbleSortSteps() {
    this.pseudocode.setCode(PC.bubbleSort);
    this.log.clear();
    this.log.addEntry('Starting bubble sort', 'action');

    const steps = [];
    const arr = [...this.array];
    const n = arr.length;
    steps.push({ description: `n = ${n}`, pseudocodeLine: 0, action: async () => this.renderArray() });

    for (let i = 0; i < n - 1; i++) {
      steps.push({ description: `Outer pass i = ${i}`, pseudocodeLine: 1, action: async () => this.renderArray() });
      for (let j = 0; j < n - i - 1; j++) {
        steps.push({
          description: `Compare A[${j}]=${arr[j]} with A[${j+1}]=${arr[j+1]}`, pseudocodeLine: 2,
          action: async () => {
            this.renderArray();
            document.getElementById(`cell-${j}`)?.classList.add('highlight');
            document.getElementById(`cell-${j+1}`)?.classList.add('highlight');
          },
        });
        if (Number(arr[j]) > Number(arr[j + 1])) {
          steps.push({
            description: `A[${j}] > A[${j+1}] — swap`, pseudocodeLine: 3,
            action: async () => {
              [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
              this.array = [...arr];
              this.renderArray();
              document.getElementById(`cell-${j}`)?.classList.add('shifting-right');
              document.getElementById(`cell-${j+1}`)?.classList.add('shifting-left');
            },
          });
        }
      }
    }
    steps.push({ description: `Sorted: [${arr.join(', ')}]`, pseudocodeLine: 0, logType: 'success', action: async () => {
      this.array = arr; this.renderArray();
    }});
    this.engine.setSteps(steps);
    this._updatePlaybackControls();
  }

  _generateInsertSteps(index, value) {
    this.pseudocode.setCode(PC.insert);
    this.log.clear();
    this.log.addEntry(`Insert ${value} at index ${index}`, 'action');

    const steps = [];
    const n = this.array.length;
    steps.push({ description: `n = ${n}`, pseudocodeLine: 0, action: async () => this.renderArray() });

    if (index < n) {
      for (let i = n - 1; i >= index; i--) {
        steps.push({
          description: `A[${i+1}] = A[${i}] (shift ${this.array[i]} right)`, pseudocodeLine: 2,
          action: async () => {
            document.getElementById(`cell-${i}`)?.classList.add('shifting-right', 'highlight');
          },
        });
      }
      steps.push({
        description: 'Shift complete', pseudocodeLine: 2,
        action: async () => {
          this.array.splice(index, 0, null);
          this.renderArray();
          const c = document.getElementById(`cell-${index}`);
          if (c) { c.style.opacity = '0'; c.textContent = ''; }
        },
      });
    } else {
      steps.push({
        description: 'Insert at end — no shift needed', pseudocodeLine: 1,
        action: async () => {
          this.array.splice(index, 0, null);
          this.renderArray();
          const c = document.getElementById(`cell-${index}`);
          if (c) { c.style.opacity = '0'; c.textContent = ''; }
        },
      });
    }
    steps.push({
      description: `A[${index}] = ${value}`, pseudocodeLine: 3,
      action: async () => {
        this.array[index] = value;
        const c = document.getElementById(`cell-${index}`);
        if (c) { c.textContent = value; c.style.opacity = '1'; c.classList.add('inserting'); }
      },
    });
    steps.push({ description: 'n = n + 1', pseudocodeLine: 4, action: async () => this.renderArray() });
    this.engine.setSteps(steps);
    this._updatePlaybackControls();
  }

  _generateDeleteSteps(index) {
    this.pseudocode.setCode(PC.delete);
    this.log.clear();
    this.log.addEntry(`Delete element at index ${index}`, 'action');

    const steps = [];
    const n = this.array.length;
    steps.push({
      description: `deleted = A[${index}] = ${this.array[index]}`, pseudocodeLine: 1,
      action: async () => { this.renderArray(); document.getElementById(`cell-${index}`)?.classList.add('highlight'); },
    });
    steps.push({
      description: `Mark index ${index} for deletion`, pseudocodeLine: 1,
      action: async () => {
        const c = document.getElementById(`cell-${index}`);
        if (c) { c.classList.remove('highlight'); c.classList.add('deleting'); }
      },
    });
    if (index < n - 1) {
      steps.push({ description: `Shift left from index ${index}`, pseudocodeLine: 2, action: async () => {
        const c = document.getElementById(`cell-${index}`);
        if (c) c.style.opacity = '0';
      }});
      for (let i = index; i < n - 1; i++) {
        steps.push({
          description: `A[${i}] = A[${i+1}]`, pseudocodeLine: 2,
          action: async () => document.getElementById(`cell-${i+1}`)?.classList.add('shifting-left', 'highlight'),
        });
      }
    }
    steps.push({ description: 'n = n - 1', pseudocodeLine: 3, action: async () => {
      this.array.splice(index, 1); this.renderArray();
    }});
    this.engine.setSteps(steps);
    this._updatePlaybackControls();
  }
}

document.addEventListener('DOMContentLoaded', () => new ArrayVisualizer());
