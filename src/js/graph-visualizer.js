import { AnimationEngine } from './animation-engine.js';
import { PseudocodePanel, LogPanel, AuxStructurePanel } from './ui-panels.js';
import { CustomDropdown } from './custom-dropdown.js';
import { DEFAULTS, randomGraph, randomWeightedGraph, generateDAG, generateWeightedDAG, randomInt } from './utils.js';
import { setupMobileTabs, setupSpeedControl, setupFitToScreen, setupPlaybackButtons } from './visualizer-base.js';
import { GRAPH as PC } from './pseudocode-snippets.js';
import { setupMobileTabs, setupSpeedControl, setupFitToScreen } from './visualizer-base.js';

const GRAPH_OPERATIONS = [
  { value: 'create', label: 'Create Graph', icon: '⊞' },
  { value: 'dfs', label: 'DFS Traversal', icon: '↓' },
  { value: 'bfs', label: 'BFS Traversal', icon: '⇉' },
  { value: 'dijkstra', label: "Dijkstra's Algorithm", icon: '◎' },
  { value: 'topo', label: 'Topological Sort', icon: '⇢' },
];

class GraphVisualizer {
  constructor() {
    this.n = 0;
    this.m = 0;
    this.isDirected = false;
    this.isWeighted = false;
    // Adjacency List: index i contains array of neighbors
    // Unweighted: neighbors are integers.
    // Weighted: neighbors are objects { node, weight }.
    this.adjList = [];
    
    // UI Elements
    this.container = document.getElementById('visualization-container');
    this.emptyState = document.getElementById('empty-state');
    this.inputGroup = document.getElementById('input-group');
    this.canvasArea = document.getElementById('canvas-area');
    this.dropdown = new CustomDropdown(
      document.getElementById('operation-dropdown'),
      GRAPH_OPERATIONS,
      () => this._updateInputs()
    );
    this.randomBtn = document.getElementById('random-btn');
    this.dagBtn = document.getElementById('dag-btn');
    this.graphConfigGroup = document.getElementById('graph-config-group');
    this.adjInputContainer = document.getElementById('adjacency-input-container');
    this.adjTextarea = document.getElementById('adjacency-list-textarea');
    this.directedCheckbox = document.getElementById('directed-checkbox');
    this.weightedCheckbox = document.getElementById('weighted-checkbox');
    
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
    this.auxPanel = new AuxStructurePanel('aux-structure-panel');
    
    // Auto-scaling
    this.mutationObserver = null;
    setupFitToScreen(this.container, this.canvasArea, '.graph-container');

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
        this.renderGraph(); // Clear traversal highlights, keep final graph representation
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
    const d = DEFAULTS.graph;
    this._applyGraphConfig(d.n, d.adjacency, d.directed, d.weighted);
    this.renderGraph();
    this.log.addEntry(`Default graph loaded (${d.n} nodes)`, 'info');
  }

  _applyGraphConfig(n, adjLines, directed, weighted) {
    this.n = n;
    this.isDirected = directed;
    this.isWeighted = weighted;
    this.adjList = Array.from({ length: n }, () => []);
    adjLines.forEach((line, i) => {
      if (weighted) {
        const pairRegex = /\(?\s*(\d+)\s*,\s*(\d+)\s*\)?/g;
        let match;
        while ((match = pairRegex.exec(line)) !== null) {
          const dest = parseInt(match[1]);
          const weight = parseInt(match[2]);
          if (dest >= 0 && dest < n) this.adjList[i].push({ node: dest, weight });
        }
      } else {
        const numRegex = /(\d+)/g;
        let match;
        while ((match = numRegex.exec(line)) !== null) {
          const dest = parseInt(match[0]);
          if (dest >= 0 && dest < n) this.adjList[i].push(dest);
        }
      }
    });
  }

  _applyGraphToForm(g) {
    const nInput = document.getElementById('input-n');
    const mInput = document.getElementById('input-m');
    if (nInput) nInput.value = g.n;
    if (mInput) mInput.value = g.m;
    if (this.directedCheckbox) this.directedCheckbox.checked = g.directed;
    if (this.weightedCheckbox) this.weightedCheckbox.checked = g.weighted;
    this.adjTextarea.value = g.adjacency.join('\n');
  }

  _fillRandom() {
    const op = this.dropdown.getValue();
    if (op === 'create') {
      const weighted = this.weightedCheckbox?.checked;
      const g = weighted ? randomWeightedGraph(6) : randomGraph(6);
      this._applyGraphToForm(g);
      this._generateCreateSteps(g.n, g.m);
      this.engine.play();
    }
  }

  _fillDAG() {
    const op = this.dropdown.getValue();
    if (op !== 'create') return;
    const weighted = this.weightedCheckbox?.checked;
    const g = weighted ? generateWeightedDAG(6) : generateDAG(6);
    this._applyGraphToForm(g);
    this._generateCreateSteps(g.n, g.m);
    this.engine.play();
  }

  _bindEvents() {
    this.dropdown.container?.addEventListener?.('change', () => {});
    this.randomBtn?.addEventListener('click', () => this._fillRandom());
    this.dagBtn?.addEventListener('click', () => this._fillDAG());
    this.directedCheckbox.addEventListener('change', () => this._updateTextareaPlaceholder());
    this.weightedCheckbox.addEventListener('change', () => this._updateTextareaPlaceholder());
    
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
      this.graphConfigGroup.style.display = 'flex';
      this.adjInputContainer.style.display = 'block';

      const nInput = document.createElement('input');
      nInput.type = 'number'; nInput.id = 'input-n'; nInput.className = 'input-field narrow';
      nInput.min = '1'; nInput.value = String(DEFAULTS.graph.n);
      this.inputGroup.appendChild(Object.assign(document.createElement('span'), { className: 'input-label', textContent: 'n:' }));
      this.inputGroup.appendChild(nInput);

      const mInput = document.createElement('input');
      mInput.type = 'number'; mInput.id = 'input-m'; mInput.className = 'input-field narrow';
      mInput.min = '0'; mInput.value = String(DEFAULTS.graph.m);
      this.inputGroup.appendChild(Object.assign(document.createElement('span'), { className: 'input-label', textContent: 'm:' }));
      this.inputGroup.appendChild(mInput);
      
      this.directedCheckbox.checked = DEFAULTS.graph.directed;
      this.weightedCheckbox.checked = DEFAULTS.graph.weighted;
      this.adjTextarea.value = DEFAULTS.graph.adjacency.join('\n');
    } else {
      this.graphConfigGroup.style.display = 'none';
      this.adjInputContainer.style.display = 'none';

      this.inputGroup.appendChild(Object.assign(document.createElement('span'), { className: 'input-label', textContent: 'Start:' }));
      const startInput = document.createElement('input');
      startInput.type = 'number'; startInput.id = 'input-start-node';
      startInput.className = 'input-field narrow'; startInput.min = '0'; startInput.value = '0';
      this.inputGroup.appendChild(startInput);
    }
  }

  _updateTextareaPlaceholder() {
    const isW = this.weightedCheckbox.checked;
    const isD = this.directedCheckbox.checked;
    
    if (isW) {
      this.adjTextarea.placeholder = `e.g. For weighted graph (n=4):&#10;(1, 5), (2, 8)  (neighbors of node 0)&#10;(2, 3)         (neighbors of node 1)&#10;(3, 2)         (neighbors of node 2)&#10;               (neighbors of node 3)`;
      this.adjTextarea.value = `(1, 5), (2, 8)\n(2, 3)\n(3, 2)\n`;
    } else {
      this.adjTextarea.placeholder = `e.g. For unweighted graph (n=4):&#10;1, 2  (neighbors of node 0)&#10;2     (neighbors of node 1)&#10;3     (neighbors of node 2)&#10;      (neighbors of node 3)`;
      this.adjTextarea.value = `1, 2\n2\n3\n`;
    }
  }

  resetApp() {
    this.engine.reset();
    this.auxPanel.reset();
    this.n = 0;
    this.adjList = [];
    this.renderGraph();
    this.log.clear();
    this.pseudocode.reset();
    this._autoInit();
  }

  runOperation() {
    if (this.engine.hasNextStep || this.engine.isPlaying) return;

    const op = this.dropdown.getValue();
    
    if (op === 'create') {
      const nVal = parseInt(document.getElementById('input-n').value);
      const mVal = parseInt(document.getElementById('input-m').value);
      
      if (isNaN(nVal) || nVal <= 0) {
        this.log.addEntry('Please enter a valid number of nodes (n > 0).', 'error');
        return;
      }
      if (isNaN(mVal) || mVal < 0) {
        this.log.addEntry('Please enter a valid number of edges (m >= 0).', 'error');
        return;
      }
      
      this._generateCreateSteps(nVal, mVal);
    } else {
      if (this.n === 0) {
        this.log.addEntry('Graph must be created first before traversals.', 'error');
        return;
      }

      const startVal = parseInt(document.getElementById('input-start-node').value);
      if (isNaN(startVal) || startVal < 0 || startVal >= this.n) {
        this.log.addEntry(`Please enter a valid start node index between 0 and ${this.n - 1}.`, 'error');
        return;
      }

      if (op === 'dfs') {
        this.auxPanel.setType('stack');
        this._generateDFSSteps(startVal);
      } else if (op === 'bfs') {
        this.auxPanel.setType('queue');
        this._generateBFSSteps(startVal);
      } else if (op === 'dijkstra') {
        if (!this.isWeighted) { this.log.addEntry('Dijkstra requires a weighted graph.', 'error'); return; }
        this._generateDijkstraSteps(startVal);
      } else if (op === 'topo') {
        if (!this.isDirected) { this.log.addEntry('Topological sort requires a directed graph.', 'error'); return; }
        this._generateTopoSteps();
      }
    }
    
    this.engine.play();
  }

  /* ---------------- GRAPH RENDERING ---------------- */

  _getCoordinates() {
    const coords = [];
    const W = 520;
    const H = 420;
    const cx = W / 2;
    const cy = H / 2;
    const R = Math.min(cx, cy) - 50;

    for (let i = 0; i < this.n; i++) {
      const theta = (2 * Math.PI * i) / this.n - Math.PI / 2; // Start from top
      const x = cx + R * Math.cos(theta);
      const y = cy + R * Math.sin(theta);
      coords.push({ x, y });
    }
    return { coords, W, H };
  }

  renderGraph(nodeStates = {}, activeEdges = [], traversalResult = []) {
    if (this.n === 0) {
      this.container.innerHTML = '';
      this.container.appendChild(this.emptyState);
      this.emptyState.style.display = 'flex';
      return;
    }

    this.emptyState.style.display = 'none';
    const dims = this._getCoordinates();

    let html = `<div class="graph-container" style="width: ${dims.W}px; height: ${dims.H}px;">`;
    
    // Draw SVG layer for edges
    html += `<svg class="graph-svg">`;
    
    // Markers for directed graph arrows
    if (this.isDirected) {
      html += `
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="21" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent-amber)" />
          </marker>
          <marker id="arrow-highlight" viewBox="0 0 10 10" refX="21" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent-cyan)" />
          </marker>
          <marker id="arrow-active" viewBox="0 0 10 10" refX="21" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent-purple)" />
          </marker>
        </defs>
      `;
    }

    // Render edges
    const renderedEdges = new Set();
    
    for (let u = 0; u < this.n; u++) {
      const neighbors = this.adjList[u] || [];
      neighbors.forEach((neigh) => {
        const v = this.isWeighted ? neigh.node : neigh;
        const weight = this.isWeighted ? neigh.weight : null;
        
        // Key for undirected checking
        const edgeKey = this.isDirected ? `${u}->${v}` : [u, v].sort().join('-');
        
        if (this.isDirected || !renderedEdges.has(edgeKey)) {
          renderedEdges.add(edgeKey);
          
          const p1 = dims.coords[u];
          const p2 = dims.coords[v];
          
          // Edge highlighting
          let edgeClass = 'edge-line';
          let markerAttr = this.isDirected ? 'marker-end="url(#arrow)"' : '';
          
          const highlightMatch = activeEdges.some(e => e.u === u && e.v === v);
          const activeMatch = activeEdges.some(e => e.u === u && e.v === v && e.active);
          
          if (activeMatch) {
            edgeClass += ' active';
            if (this.isDirected) markerAttr = 'marker-end="url(#arrow-active)"';
          } else if (highlightMatch) {
            edgeClass += ' highlight';
            if (this.isDirected) markerAttr = 'marker-end="url(#arrow-highlight)"';
          }

          // Render line
          html += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" class="${edgeClass}" ${markerAttr} />`;
          
          // Render edge weight text at the midpoint
          if (this.isWeighted) {
            const mx = (p1.x + p2.x) / 2;
            const my = (p1.y + p2.y) / 2;
            const textOffset = 8;
            
            // Adjust offset depending on line slope to avoid text overlap with line
            html += `
              <text x="${mx}" y="${my}" class="edge-weight ${highlightMatch ? 'highlight' : ''}">
                ${weight}
              </text>
            `;
          }
        }
      });
    }
    
    html += `</svg>`;

    // Render Nodes
    for (let i = 0; i < this.n; i++) {
      const p = dims.coords[i];
      let stateClass = '';
      if (nodeStates[i]) {
        stateClass = ` ${nodeStates[i]}`; // visiting, visited, current
      }
      html += `<div class="graph-node${stateClass}" style="left: ${p.x}px; top: ${p.y}px;" id="node-${i}">${i}</div>`;
    }

    // Traversal array display on bottom of canvas
    if (traversalResult.length > 0) {
      html += `
        <div class="traversal-result-container">
          <span class="traversal-title">Traversal:</span>
          <div class="traversal-list">
            ${traversalResult.map((val, idx) => `
              <div class="traversal-item ${idx === traversalResult.length - 1 ? 'active' : ''}">${val}</div>
            `).join('')}
          </div>
        </div>
      `;
    }

    html += `</div>`;
    this.container.innerHTML = html;
  }

  /* ---------------- ANIMATION GENERATORS ---------------- */

  _generateCreateSteps(n, m) {
    this.pseudocode.setCode(PC.create);
    this.log.clear();

    const rawText = this.adjTextarea.value;
    const lines = rawText.split('\n').map(l => l.trim());
    
    this.n = n;
    this.m = m;
    this.isDirected = this.directedCheckbox.checked;
    this.isWeighted = this.weightedCheckbox.checked;
    this.adjList = Array.from({ length: n }, () => []);

    // Parse adjacency vectors
    for (let i = 0; i < n; i++) {
      const line = lines[i] || '';
      if (this.isWeighted) {
        // Parse pairs of integers, e.g., (1, 5) or 1,5 or (2, 3)
        // Match numbers in pairs inside or outside parentheses
        const pairRegex = /\(?\s*(\d+)\s*,\s*(\d+)\s*\)?/g;
        let match;
        while ((match = pairRegex.exec(line)) !== null) {
          const dest = parseInt(match[1]);
          const weight = parseInt(match[2]);
          if (dest >= 0 && dest < n) {
            this.adjList[i].push({ node: dest, weight });
          }
        }
      } else {
        // Parse simple integers
        const numRegex = /(\d+)/g;
        let match;
        while ((match = numRegex.exec(line)) !== null) {
          const dest = parseInt(match[0]);
          if (dest >= 0 && dest < n) {
            this.adjList[i].push(dest);
          }
        }
      }
    }

    this.log.addEntry(`Created graph with ${n} nodes and adjacency list vector of datatype ${this.isWeighted ? 'pair<int, int>' : 'int'}.`, 'action');

    const steps = [];
    steps.push({
      description: 'Rendering initialized graph canvas',
      pseudocodeLine: 0,
      action: async () => {
        this.renderGraph();
      }
    });

    this.engine.setSteps(steps);
    this._updatePlaybackControls();
  }

  _generateDFSSteps(startNode) {
    this.pseudocode.setCode(PC.dfs);
    this.log.clear();
    this.log.addEntry(`Iterative DFS from node ${startNode}`, 'action');
    this.auxPanel.show('stack', 'DFS Stack');

    const events = [];
    const simVisited = Array(this.n).fill(false);
    const simStack = [startNode];
    events.push({ type: 'push', node: startNode });

    while (simStack.length > 0) {
      const u = simStack.pop();
      events.push({ type: 'pop', node: u });
      if (simVisited[u]) { events.push({ type: 'skip', node: u }); continue; }
      simVisited[u] = true;
      events.push({ type: 'visit', node: u });
      const neighbors = this.adjList[u] || [];
      for (let i = neighbors.length - 1; i >= 0; i--) {
        const v = this.isWeighted ? neighbors[i].node : neighbors[i];
        if (!simVisited[v]) {
          simStack.push(v);
          events.push({ type: 'push', node: v, from: u });
        }
      }
    }

    const steps = [];
    const stack = [];
    const visited = Array(this.n).fill(false);
    const traversal = [];
    const nodeStates = {};
    const edgesHighlight = [];
    const syncStack = () => this.auxPanel.setItems(stack.map(String));

    events.forEach(ev => {
      if (ev.type === 'push') {
        steps.push({
          description: `stack.push(${ev.node})`, pseudocodeLine: 3,
          action: async () => {
            stack.push(ev.node);
            if (ev.from !== undefined) { nodeStates[ev.node] = 'visiting'; edgesHighlight.push({ u: ev.from, v: ev.node }); }
            syncStack();
            this.renderGraph({ ...nodeStates }, [...edgesHighlight], [...traversal]);
          },
        });
      } else if (ev.type === 'pop') {
        steps.push({
          description: `u = stack.pop() → ${ev.node}`, pseudocodeLine: 5,
          action: async () => { stack.pop(); syncStack(); },
        });
      } else if (ev.type === 'skip') {
        steps.push({
          description: `visited[${ev.node}] already true — skip`, pseudocodeLine: 6,
          action: async () => {},
        });
      } else if (ev.type === 'visit') {
        steps.push({
          description: `visited[${ev.node}] = true; visit(${ev.node})`, pseudocodeLine: 7,
          action: async () => {
            visited[ev.node] = true;
            traversal.push(ev.node);
            Object.keys(nodeStates).forEach(k => { if (nodeStates[k] === 'current') nodeStates[k] = 'visited'; });
            nodeStates[ev.node] = 'current';
            this.renderGraph({ ...nodeStates }, [...edgesHighlight], [...traversal]);
          },
        });
      }
    });

    steps.push({
      description: `DFS order: [${traversal.join(', ')}]`, pseudocodeLine: 0, logType: 'success',
      action: async () => {
        for (let i = 0; i < this.n; i++) if (visited[i]) nodeStates[i] = 'visited';
        this.renderGraph({ ...nodeStates }, [...edgesHighlight], [...traversal]);
        this.auxPanel.hide();
      },
    });

    this.engine.setSteps(steps);
    this._updatePlaybackControls();
  }

  _generateBFSSteps(startNode) {
    this.pseudocode.setCode(PC.bfs);
    this.log.clear();
    this.log.addEntry(`BFS from node ${startNode}`, 'action');
    this.auxPanel.show('queue', 'BFS Queue');

    const events = [];
    const simVisited = Array(this.n).fill(false);
    const simQueue = [startNode];
    simVisited[startNode] = true;
    events.push({ type: 'enqueue', node: startNode, init: true });

    while (simQueue.length > 0) {
      const u = simQueue.shift();
      events.push({ type: 'dequeue', node: u });
      events.push({ type: 'visit', node: u });
      const neighbors = this.adjList[u] || [];
      for (const neigh of neighbors) {
        const v = this.isWeighted ? neigh.node : neigh;
        events.push({ type: 'check', u, v });
        if (!simVisited[v]) {
          simVisited[v] = true;
          simQueue.push(v);
          events.push({ type: 'enqueue', node: v, from: u });
        }
      }
    }

    const steps = [];
    const queue = [];
    const traversal = [];
    const nodeStates = {};
    const edgesHighlight = [];
    const syncQueue = () => this.auxPanel.setItems(queue.map(String));

    events.forEach(ev => {
      if (ev.type === 'enqueue') {
        steps.push({
          description: ev.init ? `queue.enqueue(${ev.node}); visited[${ev.node}] = true` : `queue.enqueue(${ev.node}); visited[${ev.node}] = true`,
          pseudocodeLine: ev.init ? 3 : 9,
          action: async () => {
            queue.push(ev.node);
            nodeStates[ev.node] = 'visiting';
            if (ev.from !== undefined) edgesHighlight.push({ u: ev.from, v: ev.node });
            syncQueue();
            this.renderGraph({ ...nodeStates }, [...edgesHighlight], [...traversal]);
          },
        });
      } else if (ev.type === 'dequeue') {
        steps.push({
          description: `u = queue.dequeue() → ${ev.node}`, pseudocodeLine: 5,
          action: async () => { queue.shift(); syncQueue(); },
        });
      } else if (ev.type === 'visit') {
        steps.push({
          description: `visit(${ev.node})`, pseudocodeLine: 6,
          action: async () => {
            traversal.push(ev.node);
            Object.keys(nodeStates).forEach(k => { if (nodeStates[k] === 'current') nodeStates[k] = 'visited'; });
            nodeStates[ev.node] = 'current';
            this.renderGraph({ ...nodeStates }, [...edgesHighlight], [...traversal]);
          },
        });
      } else if (ev.type === 'check') {
        steps.push({
          description: `Check neighbor ${ev.v} of ${ev.u}`, pseudocodeLine: 7,
          action: async () => {
            this.renderGraph({ ...nodeStates }, [...edgesHighlight, { u: ev.u, v: ev.v, active: true }], [...traversal]);
          },
        });
      }
    });

    steps.push({
      description: `BFS order: [${traversal.join(', ')}]`, pseudocodeLine: 0, logType: 'success',
      action: async () => {
        Object.keys(nodeStates).forEach(k => nodeStates[k] = 'visited');
        this.renderGraph({ ...nodeStates }, [...edgesHighlight], [...traversal]);
        this.auxPanel.hide();
      },
    });

    this.engine.setSteps(steps);
    this._updatePlaybackControls();
  }

  _generateDijkstraSteps(start) {
    this.pseudocode.setCode(PC.dijkstra);
    this.log.clear();
    this.log.addEntry(`Dijkstra from node ${start}`, 'action');
    this.auxPanel.show('queue', 'Priority Queue');

    const dist = Array(this.n).fill(Infinity);
    dist[start] = 0;
    const visited = Array(this.n).fill(false);
    const pq = [{ d: 0, u: start }];
    const steps = [];
    const nodeStates = {};

    const renderPQ = () => pq.map(x => `${x.u}(${x.d})`).sort((a, b) => parseInt(a.split('(')[1]) - parseInt(b.split('(')[1]));

    steps.push({
      description: `dist[${start}] = 0`, pseudocodeLine: 1,
      action: async () => {
        nodeStates[start] = 'current';
        this.auxPanel.setItems(renderPQ());
        this.renderGraph({ ...nodeStates });
      },
    });

    while (pq.length > 0) {
      pq.sort((a, b) => a.d - b.d);
      const { d, u } = pq.shift();

      steps.push({
        description: `Extract min: node ${u} with dist ${d}`, pseudocodeLine: 4,
        action: async () => {
          this.auxPanel.setItems(renderPQ());
          nodeStates[u] = 'current';
          this.renderGraph({ ...nodeStates });
        },
      });

      if (d > dist[u]) continue;
      visited[u] = true;

      const neighbors = this.adjList[u] || [];
      for (const neigh of neighbors) {
        const v = neigh.node;
        const w = neigh.weight;
        steps.push({
          description: `Relax edge (${u},${v}) weight ${w}`, pseudocodeLine: 7,
          action: async () => {
            this.renderGraph({ ...nodeStates }, [{ u, v, active: true }]);
          },
        });
        if (dist[u] + w < dist[v]) {
          dist[v] = dist[u] + w;
          pq.push({ d: dist[v], u: v });
          steps.push({
            description: `Update dist[${v}] = ${dist[v]}`, pseudocodeLine: 8, logType: 'highlight',
            action: async () => {
              nodeStates[v] = 'visiting';
              this.auxPanel.setItems(renderPQ());
              this.renderGraph({ ...nodeStates }, [{ u, v }]);
            },
          });
        }
      }
    }

    steps.push({
      description: `dist: [${dist.map((d, i) => `${i}:${d === Infinity ? '∞' : d}`).join(', ')}]`,
      pseudocodeLine: 0, logType: 'success',
      action: async () => { this.renderGraph(); this.auxPanel.hide(); },
    });
    this.engine.setSteps(steps);
    this._updatePlaybackControls();
  }

  _generateTopoSteps() {
    this.pseudocode.setCode(PC.topo);
    this.log.clear();
    this.log.addEntry('Topological sort (Kahn\'s algorithm)', 'action');
    this.auxPanel.show('queue', 'Zero-Indegree Queue');

    const indegree = Array(this.n).fill(0);
    for (let u = 0; u < this.n; u++) {
      (this.adjList[u] || []).forEach(neigh => {
        const v = this.isWeighted ? neigh.node : neigh;
        indegree[v]++;
      });
    }

    const queue = [];
    indegree.forEach((d, i) => { if (d === 0) queue.push(i); });
    const result = [];
    const steps = [];
    const nodeStates = {};

    this.auxPanel.setItems(queue.map(String));

    steps.push({
      description: `Initialize queue: [${queue.join(', ')}]`, pseudocodeLine: 2,
      action: async () => this.renderGraph(),
    });

    while (queue.length > 0) {
      const u = queue.shift();
      steps.push({
        description: `Dequeue node ${u}`, pseudocodeLine: 4,
        action: async () => {
          this.auxPanel.setItems(queue.map(String));
          result.push(u);
          nodeStates[u] = 'current';
          this.renderGraph({ ...nodeStates }, [], [...result]);
        },
      });

      (this.adjList[u] || []).forEach(neigh => {
        const v = this.isWeighted ? neigh.node : neigh;
        indegree[v]--;
        steps.push({
          description: `Decrement indegree[${v}] → ${indegree[v]}`, pseudocodeLine: 7,
          action: async () => {
            this.renderGraph({ ...nodeStates }, [{ u, v }], [...result]);
          },
        });
        if (indegree[v] === 0) {
          queue.push(v);
          steps.push({
            description: `Enqueue node ${v} (indegree = 0)`, pseudocodeLine: 8,
            action: async () => {
              nodeStates[v] = 'visiting';
              this.auxPanel.setItems(queue.map(String));
              this.renderGraph({ ...nodeStates }, [], [...result]);
            },
          });
        }
      });
    }

    if (result.length < this.n) {
      steps.push({ description: 'Cycle detected — topological sort impossible', pseudocodeLine: 0, logType: 'error', action: async () => {} });
    } else {
      steps.push({
        description: `Topological order: [${result.join(', ')}]`, pseudocodeLine: 0, logType: 'success',
        action: async () => { this.auxPanel.hide(); this.renderGraph({}, [], result); },
      });
    }
    this.engine.setSteps(steps);
    this._updatePlaybackControls();
  }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  new GraphVisualizer();
});
