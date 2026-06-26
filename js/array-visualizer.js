import { AnimationEngine } from './animation-engine.js';
import { PseudocodePanel, LogPanel } from './ui-panels.js';

class ArrayVisualizer {
  constructor() {
    this.array = [];
    
    // UI Elements
    this.container = document.getElementById('visualization-container');
    this.emptyState = document.getElementById('empty-state');
    this.opSelect = document.getElementById('operation-select');
    this.inputGroup = document.getElementById('input-group');
    
    // Buttons
    this.runBtn = document.getElementById('run-btn');
    this.playBtn = document.getElementById('play-btn');
    this.pauseBtn = document.getElementById('pause-btn');
    this.resetBtn = document.getElementById('reset-btn');
    
    // Speed
    this.speedSlider = document.getElementById('speed-slider');
    this.speedLabel = document.getElementById('speed-label');

    // Panels
    this.pseudocode = new PseudocodePanel('pseudocode-body');
    this.log = new LogPanel('log-body', 'clear-log-btn');
    
    // Auto-scaling
    this.mutationObserver = new MutationObserver(() => this._fitToScreen());
    this.mutationObserver.observe(this.container, { childList: true, subtree: true });
    window.addEventListener('resize', () => this._fitToScreen());
    
    // Animation Engine
    this.engine = new AnimationEngine({
      onStep: (step, index) => {
        if (step.pseudocodeLine !== undefined) {
          this.pseudocode.highlightLine(step.pseudocodeLine);
        }
        if (step.description) {
          this.log.addEntry(step.description, step.logType || 'info');
        }
        this._updatePlaybackControls();
      },
      onComplete: () => {
        this.log.addEntry('Operation completed.', 'success');
        this.pseudocode.clearHighlight();
        this._updatePlaybackControls();
      },
      onReset: () => {
        this._updatePlaybackControls();
      }
    });

    this._bindEvents();
    this._updateInputs();
    this._setupMobileTabs();
  }

  _bindEvents() {
    this.opSelect.addEventListener('change', () => this._updateInputs());
    
    this.runBtn.addEventListener('click', () => this.runOperation());
    this.playBtn.addEventListener('click', () => this.engine.play());
    this.pauseBtn.addEventListener('click', () => this.engine.pause());
    this.resetBtn.addEventListener('click', () => this.resetApp());
    
    this.speedSlider.addEventListener('input', (e) => {
      this.engine.setSpeed(parseInt(e.target.value));
      this.speedLabel.textContent = this.engine.speedLabel;
    });
  }

  _setupMobileTabs() {
    const tabs = document.querySelectorAll('.mobile-panel-tabs button');
    const panels = {
      canvas: document.getElementById('canvas-area'),
      pseudocode: document.getElementById('pseudocode-panel'),
      log: document.getElementById('log-panel')
    };

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Update active tab
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Show selected panel, hide others
        Object.values(panels).forEach(p => p?.classList.remove('mobile-visible'));
        const panelId = tab.dataset.panel;
        if (panels[panelId]) {
          panels[panelId].classList.add('mobile-visible');
        }
      });
    });
  }

  _fitToScreen() {
    const canvas = document.getElementById('canvas-area');
    const innerContainer = this.container.querySelector('.array-container');
    if (!innerContainer || !canvas) return;

    // Reset transform to measure natural width
    this.container.style.transform = 'none';
    
    const canvasWidth = canvas.clientWidth - 64; // 32px padding on each side
    const scrollWidth = innerContainer.scrollWidth;

    if (scrollWidth > canvasWidth && scrollWidth > 0) {
      const scale = canvasWidth / scrollWidth;
      this.container.style.transform = `scale(${scale})`;
    }
  }

  _updatePlaybackControls() {
    const isPlaying = this.engine.isPlaying;
    const hasNext = this.engine.hasNextStep;
    
    this.runBtn.disabled = isPlaying || hasNext;
    this.playBtn.disabled = !hasNext || isPlaying;
    this.pauseBtn.disabled = !isPlaying;
  }

  _updateInputs() {
    const op = this.opSelect.value;
    this.inputGroup.innerHTML = '';
    
    if (op === 'create') {
      const input = document.createElement('input');
      input.type = 'text';
      input.id = 'input-values';
      input.className = 'input-field';
      input.placeholder = 'Values (e.g. 5,12,8,3)';
      this.inputGroup.appendChild(input);
    } else if (op === 'insert') {
      const idxInput = document.createElement('input');
      idxInput.type = 'number';
      idxInput.id = 'input-index';
      idxInput.className = 'input-field narrow';
      idxInput.placeholder = 'Index';
      idxInput.min = '0';
      this.inputGroup.appendChild(idxInput);

      const valInput = document.createElement('input');
      valInput.type = 'text';
      valInput.id = 'input-value';
      valInput.className = 'input-field narrow';
      valInput.placeholder = 'Value';
      this.inputGroup.appendChild(valInput);
    } else if (op === 'delete') {
      const idxInput = document.createElement('input');
      idxInput.type = 'number';
      idxInput.id = 'input-index';
      idxInput.className = 'input-field narrow';
      idxInput.placeholder = 'Index';
      idxInput.min = '0';
      this.inputGroup.appendChild(idxInput);
    }
  }

  renderArray() {
    if (this.array.length === 0) {
      this.container.innerHTML = '';
      this.container.appendChild(this.emptyState);
      this.emptyState.style.display = 'flex';
      return;
    }

    this.emptyState.style.display = 'none';
    
    let arrayHtml = '<div class="array-container">';
    this.array.forEach((val, i) => {
      arrayHtml += `
        <div class="array-cell-wrapper" id="cell-wrapper-${i}">
          <div class="array-cell" id="cell-${i}">${val}</div>
          <div class="array-index" id="index-${i}">${i}</div>
        </div>
      `;
    });
    arrayHtml += '</div>';
    
    this.container.innerHTML = arrayHtml;
  }

  resetApp() {
    this.engine.reset();
    this.array = [];
    this.renderArray();
    this.log.clear();
    this.pseudocode.reset();
  }

  runOperation() {
    if (this.engine.hasNextStep || this.engine.isPlaying) return;

    const op = this.opSelect.value;
    
    if (op === 'create') {
      const valStr = document.getElementById('input-values').value;
      let values = [];
      if (valStr.trim()) {
        const parts = valStr.split(',').map(s => s.trim());
        const isValid = parts.every(p => /^-?\d+$/.test(p));
        if (!isValid) {
          this.log.addEntry('Invalid input. Please enter only comma-separated integers (e.g., 5,12,8,3).', 'error');
          return;
        }
        values = parts;
      } else {
        // default if empty
        values = ['0', '0', '0', '0', '0'];
      }
      this._generateCreateSteps(values);
    } else if (op === 'insert') {
      const idx = parseInt(document.getElementById('input-index').value);
      const val = document.getElementById('input-value').value;
      if (isNaN(idx) || idx < 0 || idx > this.array.length) {
        this.log.addEntry(`Invalid index. Must be between 0 and ${this.array.length}.`, 'error');
        return;
      }
      if (val.trim() === '') {
        this.log.addEntry(`Please enter a value.`, 'error');
        return;
      }
      this._generateInsertSteps(idx, val);
    } else if (op === 'delete') {
      const idx = parseInt(document.getElementById('input-index').value);
      if (isNaN(idx) || idx < 0 || idx >= this.array.length) {
        this.log.addEntry(`Invalid index. Must be between 0 and ${this.array.length - 1}.`, 'error');
        return;
      }
      this._generateDeleteSteps(idx);
    }
    
    // Auto-start animation
    this.engine.play();
  }

  // --- Operations ---

  _generateCreateSteps(values) {
    const code = [
      'function createArray(values):',
      '  n = values.length',
      '  arr = new Array(n)',
      '  for i = 0 to n-1:',
      '    arr[i] = values[i]',
      '  return arr'
    ];
    this.pseudocode.setCode(code);
    this.log.clear();
    this.log.addEntry(`Creating array with values: [${values.join(', ')}]`, 'action');

    const steps = [];
    steps.push({
      description: `Calculating length: n = ${values.length}`,
      pseudocodeLine: 1,
      action: async (eng) => {
        this.array = [];
        this.renderArray(); // clear it first
      }
    });

    steps.push({
      description: `Allocating new array of size ${values.length}`,
      pseudocodeLine: 2,
      action: async (eng) => {
        this.emptyState.style.display = 'none';
        this.container.innerHTML = '<div class="array-container"></div>';
      }
    });

    values.forEach((val, i) => {
      steps.push({
        description: `arr[${i}] = ${val}`,
        pseudocodeLine: 4,
        action: async (eng) => {
          this.array.push(val);
          const cont = this.container.querySelector('.array-container');
          const wrapper = document.createElement('div');
          wrapper.className = 'array-cell-wrapper';
          wrapper.id = `cell-wrapper-${i}`;
          wrapper.innerHTML = `
            <div class="array-cell inserting" id="cell-${i}">${val}</div>
            <div class="array-index" id="index-${i}">${i}</div>
          `;
          cont.appendChild(wrapper);
        }
      });
    });

    steps.push({
      description: `Array creation complete.`,
      pseudocodeLine: 5,
      action: async (eng) => {
        this.container.querySelectorAll('.array-cell.inserting').forEach(el => el.classList.remove('inserting'));
      }
    });

    this.engine.setSteps(steps);
    this._updatePlaybackControls();
  }

  _generateInsertSteps(index, value) {
    const code = [
      'function insert(arr, index, value):',
      '  n = arr.length',
      '  // Shift elements right',
      '  for i = n-1 down to index:',
      '    arr[i+1] = arr[i]',
      '  // Insert new element  ',
      '  arr[index] = value',
      '  return arr'
    ];
    this.pseudocode.setCode(code);
    this.log.clear();
    this.log.addEntry(`Inserting value ${value} at index ${index}`, 'action');

    const steps = [];
    const n = this.array.length;

    steps.push({
      description: `n = ${n}`,
      pseudocodeLine: 1,
      action: async (eng) => { this.renderArray(); }
    });

    // Shift elements right
    if (index < n) {
      steps.push({
        description: `Starting shift loop from index ${n-1} down to ${index}`,
        pseudocodeLine: 3,
        action: async (eng) => {}
      });

      for (let i = n - 1; i >= index; i--) {
        steps.push({
          description: `arr[${i+1}] = arr[${i}] (Shift ${this.array[i]} right)`,
          pseudocodeLine: 4,
          action: async (eng) => {
            const cell = document.getElementById(`cell-${i}`);
            if (cell) {
              cell.classList.add('shifting-right');
              cell.classList.add('highlight');
            }
          }
        });
      }
      
      // Update DOM to reflect shifted array (visually preparing for insertion)
      steps.push({
        description: `Elements shifted.`,
        pseudocodeLine: 5,
        action: async (eng) => {
          this.array.splice(index, 0, null); // Temporarily insert null
          this.renderArray();
          // Leave gap empty visually
          const newCell = document.getElementById(`cell-${index}`);
          if (newCell) {
             newCell.style.opacity = '0';
             newCell.textContent = '';
          }
        }
      });
    } else {
       // Append at the end, no shifting needed
       steps.push({
        description: `Inserting at end, no shifting needed.`,
        pseudocodeLine: 3,
        action: async (eng) => {
          this.array.splice(index, 0, null);
          this.renderArray();
          const newCell = document.getElementById(`cell-${index}`);
          if (newCell) {
             newCell.style.opacity = '0';
             newCell.textContent = '';
          }
        }
      });
    }

    // Insert new element
    steps.push({
      description: `arr[${index}] = ${value}`,
      pseudocodeLine: 6,
      action: async (eng) => {
        this.array[index] = value;
        const newCell = document.getElementById(`cell-${index}`);
        if (newCell) {
          newCell.textContent = value;
          newCell.style.opacity = '1';
          newCell.classList.add('inserting');
        }
      }
    });

    steps.push({
      description: `Insertion complete.`,
      pseudocodeLine: 7,
      action: async (eng) => {
        this.renderArray(); // Re-render to clear animation classes
      }
    });

    this.engine.setSteps(steps);
    this._updatePlaybackControls();
  }

  _generateDeleteSteps(index) {
    const code = [
      'function delete(arr, index):',
      '  deleted = arr[index]',
      '  n = arr.length',
      '  // Shift elements left',
      '  for i = index to n-2:',
      '    arr[i] = arr[i+1]',
      '  // Remove last element',
      '  arr.length = n - 1',
      '  return deleted'
    ];
    this.pseudocode.setCode(code);
    this.log.clear();
    this.log.addEntry(`Deleting element at index ${index}`, 'action');

    const steps = [];
    const n = this.array.length;

    steps.push({
      description: `deleted = ${this.array[index]}`,
      pseudocodeLine: 1,
      action: async (eng) => {
        this.renderArray();
        const cell = document.getElementById(`cell-${index}`);
        if(cell) cell.classList.add('highlight');
      }
    });

    steps.push({
      description: `Marking cell at index ${index} for deletion`,
      pseudocodeLine: 1,
      action: async (eng) => {
        const cell = document.getElementById(`cell-${index}`);
        if(cell) {
          cell.classList.remove('highlight');
          cell.classList.add('deleting');
        }
      }
    });

    // Shift left
    if (index < n - 1) {
      steps.push({
        description: `Starting shift loop from index ${index} to ${n-2}`,
        pseudocodeLine: 4,
        action: async (eng) => {
           // hide the deleted cell
           const cell = document.getElementById(`cell-${index}`);
           if(cell) cell.style.opacity = '0';
        }
      });

      for (let i = index; i < n - 1; i++) {
        steps.push({
          description: `arr[${i}] = arr[${i+1}] (Shift ${this.array[i+1]} left)`,
          pseudocodeLine: 5,
          action: async (eng) => {
            const cell = document.getElementById(`cell-${i+1}`);
            if (cell) {
              cell.classList.add('shifting-left');
              cell.classList.add('highlight');
            }
          }
        });
      }
    }

    steps.push({
      description: `Removing last element space, updating array.`,
      pseudocodeLine: 7,
      action: async (eng) => {
        this.array.splice(index, 1);
        this.renderArray();
      }
    });

    steps.push({
      description: `Deletion complete.`,
      pseudocodeLine: 8,
      action: async (eng) => {
        this.renderArray();
      }
    });

    this.engine.setSteps(steps);
    this._updatePlaybackControls();
  }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  new ArrayVisualizer();
});
