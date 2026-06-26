import { AnimationEngine } from './animation-engine.js';
import { PseudocodePanel, LogPanel } from './ui-panels.js';
import { CustomDropdown } from './custom-dropdown.js';
import { DEFAULTS, randomLinkedList, parseIntList } from './utils.js';
import { LINKED_LIST as PC } from './pseudocode-snippets.js';
import { setupMobileTabs, setupSpeedControl, setupFitToScreen } from './visualizer-base.js';

const LL_OPERATIONS = [
  { value: 'create', label: 'Create List', icon: '⊞' },
  { value: 'search', label: 'Search', icon: '🔍' },
  { value: 'insert-head', label: 'Insert at Head', icon: '⊕' },
  { value: 'insert-pos', label: 'Insert at Position', icon: '↳' },
  { value: 'delete-head', label: 'Delete Head', icon: '⊖' },
  { value: 'delete-pos', label: 'Delete at Position', icon: '✕' },
  { value: 'find-middle', label: 'Find Middle', icon: '◎' },
  { value: 'reverse', label: 'Reverse List', icon: '⇄' },
];

class ListNode {
  constructor(value) {
    this.value = value;
    this.next = null;
  }
}

class LinkedListVisualizer {
  constructor() {
    this.head = null;
    
    // UI Elements
    this.container = document.getElementById('visualization-container');
    this.emptyState = document.getElementById('empty-state');
    this.inputGroup = document.getElementById('input-group');
    this.canvasArea = document.getElementById('canvas-area');
    this.dropdown = new CustomDropdown(
      document.getElementById('operation-dropdown'),
      LL_OPERATIONS,
      () => this._updateInputs()
    );
    this.randomBtn = document.getElementById('random-btn');
    
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
    setupFitToScreen(this.container, this.canvasArea, '.ll-container');

    // Engine
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
        this.renderList(); // Clean up transient animation classes
      },
      onReset: () => {
        this._updatePlaybackControls();
      }
    });

    this._bindEvents();
    setupMobileTabs();
    setupSpeedControl(this.engine, this.speedSlider, this.speedLabel);
    this._updateInputs();
    this._autoInit();
  }

  _autoInit() {
    this._buildListInstant(DEFAULTS.linkedList.map(String));
    this.log.addEntry(`Default list loaded: [${DEFAULTS.linkedList.join(', ')}]`, 'info');
  }

  _buildListInstant(values) {
    this.head = null;
    values.forEach(v => {
      const node = new ListNode(v);
      if (!this.head) this.head = node;
      else {
        let c = this.head;
        while (c.next) c = c.next;
        c.next = node;
      }
    });
    this.renderList();
  }

  _fillRandom() {
    const op = this.dropdown.getValue();
    if (op === 'create') {
      const input = document.getElementById('input-values');
      if (input) input.value = randomLinkedList().join(', ');
      else this._generateCreateSteps(randomLinkedList().map(String));
    } else if (op === 'reverse') {
      this._generateReverseSteps();
      this.engine.play();
    } else if (op === 'search') {
      const v = document.getElementById('input-value');
      if (v && this.head) {
        const vals = [];
        let c = this.head;
        while (c) { vals.push(c.value); c = c.next; }
        v.value = vals[Math.floor(Math.random() * vals.length)];
      }
    }
  }

  _bindEvents() {
    this.randomBtn?.addEventListener('click', () => this._fillRandom());
    this.runBtn.addEventListener('click', () => this.runOperation());
    this.playBtn.addEventListener('click', () => this.engine.play());
    this.pauseBtn.addEventListener('click', () => this.engine.pause());
    this.resetBtn.addEventListener('click', () => this.resetApp());
  }

  _updatePlaybackControls() {
    const isPlaying = this.engine.isPlaying;
    const hasNext = this.engine.hasNextStep;
    
    this.runBtn.disabled = isPlaying || hasNext;
    this.playBtn.disabled = !hasNext || isPlaying;
    this.pauseBtn.disabled = !isPlaying;
  }

  _updateInputs() {
    const op = this.dropdown.getValue();
    this.inputGroup.innerHTML = '';
    
    if (op === 'create') {
      const input = document.createElement('input');
      input.type = 'text';
      input.id = 'input-values';
      input.className = 'input-field';
      input.placeholder = 'Values (e.g. 10,20,30)';
      input.value = DEFAULTS.linkedList.join(', ');
      this.inputGroup.appendChild(input);
    } else if (op === 'search') {
      const input = document.createElement('input');
      input.type = 'text';
      input.id = 'input-value';
      input.className = 'input-field narrow';
      input.placeholder = 'Value';
      this.inputGroup.appendChild(input);
    } else if (op === 'insert-head') {
      const input = document.createElement('input');
      input.type = 'text';
      input.id = 'input-value';
      input.className = 'input-field narrow';
      input.placeholder = 'Value';
      this.inputGroup.appendChild(input);
    } else if (op === 'insert-pos') {
      const idx = document.createElement('input');
      idx.type = 'number';
      idx.id = 'input-pos';
      idx.className = 'input-field narrow';
      idx.placeholder = 'Position';
      idx.min = '0';
      this.inputGroup.appendChild(idx);

      const val = document.createElement('input');
      val.type = 'text';
      val.id = 'input-value';
      val.className = 'input-field narrow';
      val.placeholder = 'Value';
      this.inputGroup.appendChild(val);
    } else if (op === 'delete-pos') {
      const idx = document.createElement('input');
      idx.type = 'number';
      idx.id = 'input-pos';
      idx.className = 'input-field narrow';
      idx.placeholder = 'Position';
      idx.min = '0';
      this.inputGroup.appendChild(idx);
    }
    // delete-head and find-middle have no inputs
  }

  _getLength() {
    let count = 0;
    let current = this.head;
    while (current) {
      count++;
      current = current.next;
    }
    return count;
  }

  resetApp() {
    this.engine.reset();
    this.head = null;
    this.renderList();
    this.log.clear();
    this.pseudocode.reset();
    this._autoInit();
  }

  runOperation() {
    if (this.engine.hasNextStep || this.engine.isPlaying) return;

    const op = this.dropdown.getValue();
    
    if (op === 'create') {
      const valStr = document.getElementById('input-values')?.value || '';
      const values = parseIntList(valStr, DEFAULTS.linkedList.map(String));
      if (!values) {
        this.log.addEntry('Invalid input. Use comma-separated integers.', 'error');
        return;
      }
      this._generateCreateSteps(values);
    } else if (op === 'search') {
      const val = document.getElementById('input-value').value;
      if (!val) { this.log.addEntry('Please enter a value.', 'error'); return; }
      this._generateSearchSteps(val);
    } else if (op === 'insert-head') {
      const val = document.getElementById('input-value').value;
      if (!val) { this.log.addEntry('Please enter a value.', 'error'); return; }
      this._generateInsertHeadSteps(val);
    } else if (op === 'insert-pos') {
      const pos = parseInt(document.getElementById('input-pos').value);
      const val = document.getElementById('input-value').value;
      const len = this._getLength();
      if (isNaN(pos) || pos < 0 || pos > len) {
        this.log.addEntry(`Invalid position. Must be between 0 and ${len}.`, 'error');
        return;
      }
      if (!val) { this.log.addEntry('Please enter a value.', 'error'); return; }
      this._generateInsertPosSteps(pos, val);
    } else if (op === 'delete-head') {
      if (!this.head) { this.log.addEntry('List is already empty.', 'error'); return; }
      this._generateDeleteHeadSteps();
    } else if (op === 'delete-pos') {
      const pos = parseInt(document.getElementById('input-pos').value);
      const len = this._getLength();
      if (isNaN(pos) || pos < 0 || pos >= len) {
        this.log.addEntry(`Invalid position. Must be between 0 and ${len - 1}.`, 'error');
        return;
      }
      this._generateDeletePosSteps(pos);
    } else if (op === 'find-middle') {
      if (!this.head) { this.log.addEntry('List is empty.', 'error'); return; }
      this._generateFindMiddleSteps();
    } else if (op === 'reverse') {
      if (!this.head || !this.head.next) { this.log.addEntry('Need at least 2 nodes to reverse.', 'error'); return; }
      this._generateReverseSteps();
    }
    
    this.engine.play();
  }

  _generateReverseSteps() {
    const code = PC.reverse;
    this.pseudocode.setCode(code);
    this.log.clear();
    this.log.addEntry('Reversing linked list iteratively', 'action');

    const steps = [];
    let prev = null;
    let current = this.head;
    let idx = 0;

    steps.push({ description: 'Initialize prev = null, current = head', pseudocodeLine: 1, action: async () => this.renderList([0]) });

    while (current) {
      const next = current.next;
      const curIdx = idx;
      steps.push({
        description: `Save next = current.next (node ${curIdx})`, pseudocodeLine: 4,
        action: async () => this.renderList([curIdx], [curIdx]),
      });
      steps.push({
        description: `Reverse pointer: current.next = prev`, pseudocodeLine: 5,
        action: async () => {
          current.next = prev;
          this.renderList([curIdx], [], { [curIdx]: { text: 'FLIP', class: 'slow' } });
        },
      });
      steps.push({
        description: `Advance: prev = current, current = next`, pseudocodeLine: 6,
        action: async () => {
          prev = current;
          current = next;
          idx++;
          if (current) this.renderList([idx]);
        },
      });
    }

    steps.push({
      description: 'Loop done. head = prev (new head)', pseudocodeLine: 8, logType: 'success',
      action: async () => { this.head = prev; this.renderList([0]); document.getElementById('node-0')?.classList.add('found'); },
    });

    this.engine.setSteps(steps);
    this._updatePlaybackControls();
  }

  /* ---------------- RENDERING ---------------- */

  renderList(highlightNodes = [], highlightArrows = [], pointerLabels = {}) {
    if (!this.head) {
      this.container.innerHTML = '';
      this.container.appendChild(this.emptyState);
      this.emptyState.style.display = 'flex';
      return;
    }

    this.emptyState.style.display = 'none';

    let html = '<div class="ll-container">';
    
    // We will render elements using CSS positioning or flexbox
    // HEAD label
    html += `
      <div class="ll-label-wrapper" style="margin-right: 10px;">
        <span class="ll-head-label">HEAD</span>
        <div style="height: 40px; display: flex; align-items: center; color: var(--text-muted); font-size: 20px;">→</div>
      </div>
    `;

    let current = this.head;
    let idx = 0;
    while (current) {
      let extraClasses = '';
      if (highlightNodes.includes(idx)) extraClasses += ' current';

      let labelHtml = '';
      if (pointerLabels[idx]) {
        let text = pointerLabels[idx].text;
        let pClass = pointerLabels[idx].class;
        labelHtml = `<div class="pointer-indicator ${pClass}">${text}</div>`;
      }

      html += `
        <div class="ll-node-wrapper" id="node-wrapper-${idx}">
          <div class="ll-node ${extraClasses}" id="node-${idx}">
            <div class="node-data">${current.value}</div>
            <div class="node-next">•</div>
            ${labelHtml}
          </div>
      `;
      
      let arrowClasses = highlightArrows.includes(idx) ? 'highlight' : '';
      html += `
          <div class="ll-arrow ${arrowClasses}" id="arrow-${idx}">
            <svg viewBox="0 0 40 20"><line x1="0" y1="10" x2="30" y2="10"/><polyline points="25,5 30,10 25,15"/></svg>
          </div>
        </div>
      `;

      current = current.next;
      idx++;
    }

    html += `
      <div class="ll-label-wrapper">
        <span class="ll-null-label">NULL</span>
      </div>
    `;
    html += '</div>';

    this.container.innerHTML = html;
  }

  /* ---------------- ANIMATION GENERATORS ---------------- */

  _generateCreateSteps(values) {
    this.pseudocode.setCode(PC.create);
    this.log.clear();
    this.log.addEntry(`Creating linked list: [${values.join(', ')}]`, 'action');

    const steps = [];

    steps.push({
      description: `Creating head node with value ${values[0]}`,
      pseudocodeLine: 1,
      action: async () => {
        this.head = new ListNode(values[0]);
        this.renderList();
      }
    });

    for (let i = 1; i < values.length; i++) {
      steps.push({
        description: `Creating new node ${values[i]}`,
        pseudocodeLine: 4,
        action: async () => {
          let newNode = new ListNode(values[i]);
          let curr = this.head;
          while (curr.next) curr = curr.next;
          curr.next = newNode;
          this.renderList();
          const node = document.getElementById(`node-${i}`);
          if (node) node.classList.add('new-node');
        }
      });
      steps.push({
        description: `Linking current to new node`,
        pseudocodeLine: 5,
        action: async () => {
          this.renderList([i-1, i], [i-1]);
        }
      });
    }

    steps.push({
      description: `List created.`,
      pseudocodeLine: 7,
      action: async () => this.renderList()
    });

    this.engine.setSteps(steps);
    this._updatePlaybackControls();
  }

  _generateSearchSteps(target) {
    this.pseudocode.setCode(PC.search);
    this.log.clear();
    this.log.addEntry(`Searching for value: ${target}`, 'action');

    const steps = [];
    let current = this.head;
    let pos = 0;
    let found = false;

    steps.push({
      description: `Starting at head`,
      pseudocodeLine: 1,
      action: async () => this.renderList([0])
    });

    while (current) {
      const idx = pos;
      steps.push({
        description: `Visiting node at position ${idx} (value: ${current.value})`,
        pseudocodeLine: 4,
        action: async () => this.renderList([idx])
      });

      if (current.value === target) {
        steps.push({
          description: `Found ${target} at position ${idx}!`,
          pseudocodeLine: 5,
          action: async () => {
            this.renderList();
            const node = document.getElementById(`node-${idx}`);
            if (node) node.classList.add('found');
          }
        });
        found = true;
        break;
      }

      steps.push({
        description: `${current.value} != ${target}. Moving to next node.`,
        pseudocodeLine: 6,
        action: async () => {
          this.renderList([idx], [idx]);
        }
      });

      current = current.next;
      pos++;
    }

    if (!found) {
      steps.push({
        description: `Reached end of list. Value ${target} not found.`,
        pseudocodeLine: 8,
        action: async () => {
          this.renderList();
          document.querySelectorAll('.ll-node').forEach(el => el.classList.add('not-found'));
        }
      });
    }

    this.engine.setSteps(steps);
    this._updatePlaybackControls();
  }

  _generateInsertHeadSteps(value) {
    this.pseudocode.setCode(PC.insertHead);
    this.log.clear();
    this.log.addEntry(`Inserting ${value} at head`, 'action');

    const steps = [];

    steps.push({
      description: `Create newNode(${value})`,
      pseudocodeLine: 1,
      action: async () => {
        const newNode = new ListNode(value);
        newNode.next = this.head;
        this.head = newNode;
        this.renderList([0], [], { 0: { text: "NEW", class: "slow" }});
        const node = document.getElementById('node-0');
        if (node) node.classList.add('new-node');
      }
    });

    steps.push({
      description: `Set newNode.next = head`,
      pseudocodeLine: 2,
      action: async () => {
        this.renderList([0, 1], [0], { 0: { text: "NEW", class: "slow" }});
      }
    });

    steps.push({
      description: `Update head pointer`,
      pseudocodeLine: 3,
      action: async () => {
        this.renderList();
      }
    });

    this.engine.setSteps(steps);
    this._updatePlaybackControls();
  }

  _generateInsertPosSteps(pos, value) {
    if (pos === 0) return this._generateInsertHeadSteps(value);

    this.pseudocode.setCode(PC.insertPos);
    this.log.clear();
    this.log.addEntry(`Inserting ${value} at position ${pos}`, 'action');

    const steps = [];
    let current = this.head;
    
    steps.push({
      description: `Starting traversal to find position ${pos-1}`,
      pseudocodeLine: 2,
      action: async () => this.renderList([0])
    });

    for (let i = 0; i < pos - 1; i++) {
      steps.push({
        description: `Moving to next node...`,
        pseudocodeLine: 4,
        action: async () => this.renderList([i], [i])
      });
      steps.push({
        description: `At position ${i+1}`,
        pseudocodeLine: 3,
        action: async () => this.renderList([i+1])
      });
      current = current.next;
    }

    steps.push({
      description: `Create newNode(${value})`,
      pseudocodeLine: 5,
      action: async () => {
        const newNode = new ListNode(value);
        newNode.next = current.next;
        current.next = newNode;
        // Now render with the new node in place
        this.renderList([pos], [], { pos: { text: "NEW", class: "slow" }});
        const n = document.getElementById(`node-${pos}`);
        if(n) n.classList.add('new-node');
      }
    });

    steps.push({
      description: `newNode.next = current.next`,
      pseudocodeLine: 6,
      action: async () => {
        if(pos < this._getLength() - 1) {
          this.renderList([pos, pos+1], [pos], { pos: { text: "NEW", class: "slow" }});
        }
      }
    });

    steps.push({
      description: `current.next = newNode`,
      pseudocodeLine: 7,
      action: async () => {
        this.renderList([pos-1, pos], [pos-1], { pos: { text: "NEW", class: "slow" }});
      }
    });

    steps.push({
      description: `Insertion complete`,
      pseudocodeLine: 8,
      action: async () => this.renderList()
    });

    this.engine.setSteps(steps);
    this._updatePlaybackControls();
  }

  _generateDeleteHeadSteps() {
    this.pseudocode.setCode(PC.deleteHead);
    this.log.clear();
    this.log.addEntry(`Deleting head node`, 'action');

    const steps = [];

    steps.push({
      description: `Marking head node for deletion`,
      pseudocodeLine: 2,
      action: async () => {
        this.renderList([0], [], { 0: { text: "DELETE", class: "fast" }});
        const n = document.getElementById('node-0');
        if(n) {
           n.classList.remove('current');
           n.classList.add('deleting');
        }
      }
    });

    steps.push({
      description: `Moving head pointer to next node`,
      pseudocodeLine: 3,
      action: async () => {
        this.head = this.head.next;
        this.renderList();
      }
    });

    this.engine.setSteps(steps);
    this._updatePlaybackControls();
  }

  _generateDeletePosSteps(pos) {
    if (pos === 0) return this._generateDeleteHeadSteps();

    this.pseudocode.setCode(PC.deletePos);
    this.log.clear();
    this.log.addEntry(`Deleting node at position ${pos}`, 'action');

    const steps = [];
    let current = this.head;
    
    steps.push({
      description: `Starting traversal to find position ${pos-1}`,
      pseudocodeLine: 2,
      action: async () => this.renderList([0])
    });

    for (let i = 0; i < pos - 1; i++) {
      steps.push({
        description: `Moving to next node...`,
        pseudocodeLine: 4,
        action: async () => this.renderList([i], [i])
      });
      steps.push({
        description: `At position ${i+1}`,
        pseudocodeLine: 3,
        action: async () => this.renderList([i+1])
      });
      current = current.next;
    }

    steps.push({
      description: `Found node to delete at position ${pos}`,
      pseudocodeLine: 5,
      action: async () => {
        this.renderList([pos-1, pos], [], { pos: { text: "DELETE", class: "fast" }});
        const n = document.getElementById(`node-${pos}`);
        if(n) n.classList.add('deleting');
      }
    });

    steps.push({
      description: `Rewiring pointers: current.next = deleted.next`,
      pseudocodeLine: 6,
      action: async () => {
        current.next = current.next.next;
        // Node is removed logically, re-render to show updated list
        this.renderList([pos-1], [pos-1]);
      }
    });

    steps.push({
      description: `Deletion complete`,
      pseudocodeLine: 8,
      action: async () => this.renderList()
    });

    this.engine.setSteps(steps);
    this._updatePlaybackControls();
  }

  _generateFindMiddleSteps() {
    this.pseudocode.setCode(PC.findMiddle);
    this.log.clear();
    this.log.addEntry(`Finding middle node (Tortoise and Hare)`, 'action');

    const steps = [];
    let slowIdx = 0;
    let fastIdx = 0;
    let slow = this.head;
    let fast = this.head;

    const getLabels = (s, f) => {
      let labels = {};
      if (s === f) {
        labels[s] = { text: "SLOW & FAST", class: "slow" };
      } else {
        labels[s] = { text: "SLOW", class: "slow" };
        labels[f] = { text: "FAST", class: "fast" };
      }
      return labels;
    };

    steps.push({
      description: `Initialize slow and fast pointers at head`,
      pseudocodeLine: 1,
      action: async () => this.renderList([], [], getLabels(slowIdx, fastIdx))
    });

    while (fast !== null && fast.next !== null) {
      steps.push({
        description: `Check condition: fast != null && fast.next != null`,
        pseudocodeLine: 3,
        action: async () => this.renderList([], [], getLabels(slowIdx, fastIdx))
      });

      slow = slow.next;
      slowIdx++;
      steps.push({
        description: `slow = slow.next (moves 1 step)`,
        pseudocodeLine: 4,
        action: async () => {
           let labels = getLabels(slowIdx, fastIdx);
           this.renderList([], [], labels);
           const n = document.getElementById(`node-${slowIdx}`);
           if (n) {
             n.classList.add('slow-pointer');
             setTimeout(() => n.classList.remove('slow-pointer'), 500);
           }
        }
      });

      fast = fast.next.next;
      fastIdx += 2;
      steps.push({
        description: `fast = fast.next.next (moves 2 steps)`,
        pseudocodeLine: 5,
        action: async () => {
           let labels = getLabels(slowIdx, fastIdx);
           // if fast is null (past the end), don't show fast label on non-existent node
           if (fast === null) {
             delete labels[fastIdx];
           }
           this.renderList([], [], labels);
           if (fast !== null) {
             const n = document.getElementById(`node-${fastIdx}`);
             if (n) {
               n.classList.add('fast-pointer');
               setTimeout(() => n.classList.remove('fast-pointer'), 500);
             }
           }
        }
      });
    }

    steps.push({
      description: `Loop ends. Middle node is at position ${slowIdx}.`,
      pseudocodeLine: 6,
      action: async () => {
         let labels = { [slowIdx]: { text: "MIDDLE", class: "slow" } };
         this.renderList([], [], labels);
         const n = document.getElementById(`node-${slowIdx}`);
         if (n) {
            n.classList.add('found');
         }
      }
    });

    this.engine.setSteps(steps);
    this._updatePlaybackControls();
  }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  new LinkedListVisualizer();
});
