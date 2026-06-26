import { AnimationEngine } from './animation-engine.js';
import { PseudocodePanel, LogPanel } from './ui-panels.js';

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
    this.opSelect = document.getElementById('operation-select');
    this.inputGroup = document.getElementById('input-group');
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
        this.renderGraph(); // Clear traversal highlights, keep final graph representation
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
    this.directedCheckbox.addEventListener('change', () => this._updateTextareaPlaceholder());
    this.weightedCheckbox.addEventListener('change', () => this._updateTextareaPlaceholder());
    
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
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
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
    const innerContainer = this.container.querySelector('.graph-container');
    if (!innerContainer || !canvas) return;

    this.container.style.transform = 'none';
    const canvasWidth = canvas.clientWidth - 32;
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
      this.graphConfigGroup.style.display = 'flex';
      this.adjInputContainer.style.display = 'block';

      // N inputs
      const nLabel = document.createElement('span');
      nLabel.className = 'input-label';
      nLabel.textContent = 'n:';
      this.inputGroup.appendChild(nLabel);

      const nInput = document.createElement('input');
      nInput.type = 'number';
      nInput.id = 'input-n';
      nInput.className = 'input-field narrow';
      nInput.min = '1';
      nInput.value = '4';
      this.inputGroup.appendChild(nInput);

      // M inputs
      const mLabel = document.createElement('span');
      mLabel.className = 'input-label';
      mLabel.textContent = 'm:';
      this.inputGroup.appendChild(mLabel);

      const mInput = document.createElement('input');
      mInput.type = 'number';
      mInput.id = 'input-m';
      mInput.className = 'input-field narrow';
      mInput.min = '0';
      mInput.value = '4';
      this.inputGroup.appendChild(mInput);
      
      this._updateTextareaPlaceholder();
    } else {
      this.graphConfigGroup.style.display = 'none';
      this.adjInputContainer.style.display = 'none';

      // DFS/BFS Traversal start node input
      const startLabel = document.createElement('span');
      startLabel.className = 'input-label';
      startLabel.textContent = 'Start Node:';
      this.inputGroup.appendChild(startLabel);

      const startInput = document.createElement('input');
      startInput.type = 'number';
      startInput.id = 'input-start-node';
      startInput.className = 'input-field narrow';
      startInput.min = '0';
      startInput.value = '0';
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
    this.n = 0;
    this.m = 0;
    this.adjList = [];
    this.renderGraph();
    this.log.clear();
    this.pseudocode.reset();
  }

  runOperation() {
    if (this.engine.hasNextStep || this.engine.isPlaying) return;

    const op = this.opSelect.value;
    
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
        this._generateDFSSteps(startVal);
      } else if (op === 'bfs') {
        this._generateBFSSteps(startVal);
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
    const code = [
      '// Graph created adjacency list:',
      `// n = ${n}, m = ${m}`,
      `// Directed: ${this.directedCheckbox.checked}, Weighted: ${this.weightedCheckbox.checked}`,
    ];
    this.pseudocode.setCode(code);
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
    const code = [
      'function DFS(u):',
      '  visited[u] = true',
      '  add u to traversal_result',
      '  for each neighbor v of u:',
      '    if not visited[v]:',
      '      traverse edge (u, v)',
      '      DFS(v)'
    ];
    this.pseudocode.setCode(code);
    this.log.clear();
    this.log.addEntry(`Starting DFS traversal from start node ${startNode}`, 'action');

    const steps = [];
    const visited = Array(this.n).fill(false);
    const traversal = [];
    
    // Keep track of visualization states
    const nodeStates = {}; // node index -> 'visiting' / 'visited' / 'current'
    const edgesHighlight = []; // list of {u, v, active: bool}

    const dfsHelper = (u) => {
      // Step: Mark node as visited & current
      steps.push({
        description: `DFS visiting node ${u}. Marking visited.`,
        pseudocodeLine: 1,
        action: async () => {
          visited[u] = true;
          traversal.push(u);
          
          // Set states
          for (let i = 0; i < this.n; i++) {
            if (nodeStates[i] === 'current') nodeStates[i] = 'visited';
          }
          nodeStates[u] = 'current';
          this.renderGraph({ ...nodeStates }, [...edgesHighlight], [...traversal]);
        }
      });

      // Explore all neighbors
      const neighbors = this.adjList[u] || [];
      for (let i = 0; i < neighbors.length; i++) {
        const neigh = neighbors[i];
        const v = this.isWeighted ? neigh.node : neigh;
        
        steps.push({
          description: `DFS checking neighbor ${v} of node ${u}`,
          pseudocodeLine: 3,
          action: async () => {
            // Temporarily color edge as active (visiting neighbor check)
            const activeEdge = { u, v, active: true };
            this.renderGraph({ ...nodeStates }, [...edgesHighlight, activeEdge], [...traversal]);
          }
        });

        if (!visited[v]) {
          steps.push({
            description: `Neighbor ${v} is unvisited. Traversing edge (${u}, ${v})`,
            pseudocodeLine: 4,
            action: async () => {
              edgesHighlight.push({ u, v });
              this.renderGraph({ ...nodeStates }, [...edgesHighlight], [...traversal]);
            }
          });
          
          dfsHelper(v);
          
          // Returning from DFS
          steps.push({
            description: `DFS backtracking back to node ${u}`,
            pseudocodeLine: 6,
            action: async () => {
              for (let i = 0; i < this.n; i++) {
                if (nodeStates[i] === 'current') nodeStates[i] = 'visited';
              }
              nodeStates[u] = 'current';
              this.renderGraph({ ...nodeStates }, [...edgesHighlight], [...traversal]);
            }
          });
        } else {
          steps.push({
            description: `Neighbor ${v} is already visited. Skipping edge.`,
            pseudocodeLine: 4,
            action: async () => {
              this.renderGraph({ ...nodeStates }, [...edgesHighlight], [...traversal]);
            }
          });
        }
      }
    };

    dfsHelper(startNode);

    // Final finish step
    steps.push({
      description: `DFS Traversal complete. Result: [${traversal.join(', ')}]`,
      pseudocodeLine: 0,
      action: async () => {
        for (let i = 0; i < this.n; i++) {
          if (visited[i]) nodeStates[i] = 'visited';
        }
        this.renderGraph({ ...nodeStates }, [...edgesHighlight], [...traversal]);
      }
    });

    this.engine.setSteps(steps);
    this._updatePlaybackControls();
  }

  _generateBFSSteps(startNode) {
    const code = [
      'function BFS(start):',
      '  Q = new Queue()',
      '  Q.enqueue(start), visited[start] = true',
      '  while Q is not empty:',
      '    u = Q.dequeue()',
      '    add u to traversal_result',
      '    for each neighbor v of u:',
      '      if not visited[v]:',
      '        Q.enqueue(v), visited[v] = true',
      '        traverse edge (u, v)'
    ];
    this.pseudocode.setCode(code);
    this.log.clear();
    this.log.addEntry(`Starting BFS traversal from start node ${startNode}`, 'action');

    const steps = [];
    const visited = Array(this.n).fill(false);
    const traversal = [];
    
    const nodeStates = {};
    const edgesHighlight = [];

    steps.push({
      description: `Initializing Queue and marking start node ${startNode} as visited`,
      pseudocodeLine: 1,
      action: async () => {
        visited[startNode] = true;
        nodeStates[startNode] = 'visiting'; // special queued state
        this.renderGraph({ ...nodeStates }, [...edgesHighlight], []);
      }
    });

    const queue = [startNode];

    while (queue.length > 0) {
      const u = queue.shift();
      
      steps.push({
        description: `Dequeue node ${u} from Queue and process it`,
        pseudocodeLine: 4,
        action: async () => {
          traversal.push(u);
          for (let i = 0; i < this.n; i++) {
            if (nodeStates[i] === 'current') nodeStates[i] = 'visited';
          }
          nodeStates[u] = 'current';
          this.renderGraph({ ...nodeStates }, [...edgesHighlight], [...traversal]);
        }
      });

      const neighbors = this.adjList[u] || [];
      for (let i = 0; i < neighbors.length; i++) {
        const neigh = neighbors[i];
        const v = this.isWeighted ? neigh.node : neigh;

        steps.push({
          description: `BFS checking neighbor ${v} of node ${u}`,
          pseudocodeLine: 6,
          action: async () => {
            const activeEdge = { u, v, active: true };
            this.renderGraph({ ...nodeStates }, [...edgesHighlight, activeEdge], [...traversal]);
          }
        });

        if (!visited[v]) {
          steps.push({
            description: `Neighbor ${v} is unvisited. Enqueue ${v} and traverse edge (${u}, ${v})`,
            pseudocodeLine: 8,
            action: async () => {
              visited[v] = true;
              nodeStates[v] = 'visiting'; // Queued state
              edgesHighlight.push({ u, v });
              this.renderGraph({ ...nodeStates }, [...edgesHighlight], [...traversal]);
            }
          });
          queue.push(v);
        } else {
          steps.push({
            description: `Neighbor ${v} is already visited. Skipping edge.`,
            pseudocodeLine: 8,
            action: async () => {
              this.renderGraph({ ...nodeStates }, [...edgesHighlight], [...traversal]);
            }
          });
        }
      }
    }

    steps.push({
      description: `BFS Traversal complete. Result: [${traversal.join(', ')}]`,
      pseudocodeLine: 0,
      action: async () => {
        for (let i = 0; i < this.n; i++) {
          if (visited[i]) nodeStates[i] = 'visited';
        }
        this.renderGraph({ ...nodeStates }, [...edgesHighlight], [...traversal]);
      }
    });

    this.engine.setSteps(steps);
    this._updatePlaybackControls();
  }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  new GraphVisualizer();
});
