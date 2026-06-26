import { AnimationEngine } from './animation-engine.js';
import { PseudocodePanel, LogPanel } from './ui-panels.js';

class BSTNode {
  constructor(value, id) {
    this.value = value;
    this.id = id; // Unique ID for DOM element
    this.left = null;
    this.right = null;
    // Coordinates for drawing
    this.x = 0;
    this.y = 0;
  }
}

class BSTVisualizer {
  constructor() {
    this.root = null;
    this.nodeCounter = 0;
    
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
        this.renderTree(); // Clear highlight styles
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
    const innerContainer = this.container.querySelector('.bst-container');
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
    
    if (op !== 'create') {
      const input = document.createElement('input');
      input.type = 'number';
      input.id = 'input-element';
      input.className = 'input-field narrow';
      input.placeholder = 'Value x';
      this.inputGroup.appendChild(input);
    }
  }

  resetApp() {
    this.engine.reset();
    this.root = null;
    this.nodeCounter = 0;
    this.renderTree();
    this.log.clear();
    this.pseudocode.reset();
  }

  runOperation() {
    if (this.engine.hasNextStep || this.engine.isPlaying) return;

    const op = this.opSelect.value;
    
    if (op === 'create') {
      this._generateCreateSteps();
    } else {
      const valInput = document.getElementById('input-element');
      const val = parseInt(valInput.value);
      if (isNaN(val)) {
        this.log.addEntry('Please enter a valid integer.', 'error');
        return;
      }
      if (op === 'search') {
        this._generateSearchSteps(val);
      } else if (op === 'insert') {
        this._generateInsertSteps(val);
      } else if (op === 'delete') {
        this._generateDeleteSteps(val);
      }
    }
    
    this.engine.play();
  }

  /* ---------------- TREE COORDINATES & RENDERING ---------------- */

  /**
   * Traverse tree to assign X/Y coordinates using Knuth Layout.
   * X is based on in-order index, Y is based on depth.
   */
  _calculateCoordinates() {
    if (!this.root) return;

    // Get depth of tree
    const getDepth = (node) => {
      if (!node) return 0;
      return 1 + Math.max(getDepth(node.left), getDepth(node.right));
    };
    const maxDepth = getDepth(this.root);

    // Get in-order list to assign X index
    const list = [];
    const inOrder = (node, depth) => {
      if (!node) return;
      inOrder(node.left, depth + 1);
      list.push({ node, depth });
      inOrder(node.right, depth + 1);
    };
    inOrder(this.root, 0);

    const N = list.length;
    const W = Math.max(600, N * 60); // Width scales with tree size
    const H = Math.max(380, maxDepth * 80 + 60);
    const marginX = 40;
    const spacingX = N > 1 ? (W - 2 * marginX) / (N - 1) : W / 2;
    const spacingY = 70;
    const marginY = 50;

    list.forEach((item, idx) => {
      item.node.x = N > 1 ? marginX + idx * spacingX : W / 2;
      item.node.y = marginY + item.depth * spacingY;
    });

    return { W, H };
  }

  renderTree(highlightNodeId = null, currentNodeId = null, foundNodeId = null, notFoundNodeId = null, highlightEdgeIds = []) {
    if (!this.root) {
      this.container.innerHTML = '';
      this.container.appendChild(this.emptyState);
      this.emptyState.style.display = 'flex';
      return;
    }

    this.emptyState.style.display = 'none';
    const dims = this._calculateCoordinates();

    let html = `<div class="bst-container" style="width: ${dims.W}px; height: ${dims.H}px;">`;
    
    // SVG layer for edges
    html += `<svg class="tree-svg">`;
    
    // Helper to render edges recursively
    const renderEdges = (node) => {
      if (!node) return;
      if (node.left) {
        const edgeId = `edge-${node.id}-${node.left.id}`;
        const isHighlighted = highlightEdgeIds.includes(edgeId);
        html += `<line x1="${node.x}" y1="${node.y}" x2="${node.left.x}" y2="${node.left.y}" class="edge-line ${isHighlighted ? 'highlight' : ''}" id="${edgeId}" />`;
        renderEdges(node.left);
      }
      if (node.right) {
        const edgeId = `edge-${node.id}-${node.right.id}`;
        const isHighlighted = highlightEdgeIds.includes(edgeId);
        html += `<line x1="${node.x}" y1="${node.y}" x2="${node.right.x}" y2="${node.right.y}" class="edge-line ${isHighlighted ? 'highlight' : ''}" id="${edgeId}" />`;
        renderEdges(node.right);
      }
    };
    renderEdges(this.root);
    html += `</svg>`;

    // Render nodes
    const renderNodes = (node) => {
      if (!node) return;
      let extraClass = '';
      if (node.id === highlightNodeId) extraClass = ' highlight';
      else if (node.id === currentNodeId) extraClass = ' current';
      else if (node.id === foundNodeId) extraClass = ' found';
      else if (node.id === notFoundNodeId) extraClass = ' not-found';

      html += `<div class="bst-node${extraClass}" id="node-${node.id}" style="left: ${node.x}px; top: ${node.y}px;">${node.value}</div>`;
      renderNodes(node.left);
      renderNodes(node.right);
    };
    renderNodes(this.root);

    html += `</div>`;
    this.container.innerHTML = html;
  }

  /* ---------------- OPERATION GENERATORS ---------------- */

  _generateCreateSteps() {
    const code = [
      'function createRandomBST():',
      '  root = null',
      '  values = getRandomValues(5 to 7)',
      '  for value in values:',
      '    root = insert(root, value)',
      '  return root'
    ];
    this.pseudocode.setCode(code);
    this.log.clear();
    
    // Generate 5-7 random numbers, insert them into BST
    const count = 5 + Math.floor(Math.random() * 3); // 5 to 7
    const values = [];
    while (values.length < count) {
      const val = 10 + Math.floor(Math.random() * 89); // 10 to 99
      if (!values.includes(val)) values.push(val);
    }

    this.log.addEntry(`Generating random BST with values: [${values.join(', ')}]`, 'action');

    const steps = [];
    
    steps.push({
      description: 'Initializing empty BST',
      pseudocodeLine: 1,
      action: async () => {
        this.root = null;
        this.nodeCounter = 0;
        this.renderTree();
      }
    });

    let mockRoot = null;
    const insertHelper = (node, val) => {
      if (!node) {
        return new BSTNode(val, this.nodeCounter++);
      }
      if (val < node.value) {
        node.left = insertHelper(node.left, val);
      } else {
        node.right = insertHelper(node.right, val);
      }
      return node;
    };

    values.forEach((val) => {
      steps.push({
        description: `Inserting value ${val} to build the tree`,
        pseudocodeLine: 4,
        action: async () => {
          mockRoot = insertHelper(mockRoot, val);
          this.root = mockRoot;
          this.renderTree();
          // Add drop-in animation class to the newly created node
          const elementId = this.nodeCounter - 1;
          const nodeEl = document.getElementById(`node-${elementId}`);
          if (nodeEl) nodeEl.classList.add('new-node');
        }
      });
    });

    steps.push({
      description: 'BST successfully created.',
      pseudocodeLine: 5,
      action: async () => this.renderTree()
    });

    this.engine.setSteps(steps);
    this._updatePlaybackControls();
  }

  _generateSearchSteps(target) {
    const code = [
      'function search(node, x):',
      '  if node == null: return NOT_FOUND',
      '  if x == node.value: return FOUND',
      '  if x < node.value:',
      '    return search(node.left, x)',
      '  else:',
      '    return search(node.right, x)'
    ];
    this.pseudocode.setCode(code);
    this.log.clear();
    this.log.addEntry(`Searching for element x = ${target} optimally in the BST`, 'action');

    const steps = [];
    let current = this.root;
    let path = [];
    let edges = [];

    if (!current) {
      steps.push({
        description: 'Tree is empty. Element not found.',
        pseudocodeLine: 1,
        action: async () => {}
      });
      this.engine.setSteps(steps);
      return;
    }

    while (current) {
      const node = current;
      const prevNodeId = path.length > 0 ? path[path.length - 1] : null;
      const currentEdges = [...edges];
      const currentPath = [...path];

      steps.push({
        description: `Comparing search target ${target} with current node value ${node.value}`,
        pseudocodeLine: 2,
        action: async () => {
          this.renderTree(null, node.id, null, null, currentEdges);
        }
      });

      if (node.value === target) {
        steps.push({
          description: `Element ${target} matches node value. Search success!`,
          pseudocodeLine: 2,
          action: async () => {
            this.renderTree(null, null, node.id, null, currentEdges);
          }
        });
        break;
      }

      if (target < node.value) {
        if (node.left) {
          const nextEdgeId = `edge-${node.id}-${node.left.id}`;
          steps.push({
            description: `${target} < ${node.value}, traversing to left child`,
            pseudocodeLine: 4,
            action: async () => {
              this.renderTree(null, node.id, null, null, [...currentEdges, nextEdgeId]);
            }
          });
          edges.push(nextEdgeId);
          path.push(node.id);
          current = node.left;
        } else {
          steps.push({
            description: `${target} < ${node.value}, but left child is null. Element not found.`,
            pseudocodeLine: 1,
            action: async () => {
              this.renderTree(null, null, null, node.id, currentEdges);
            }
          });
          break;
        }
      } else {
        if (node.right) {
          const nextEdgeId = `edge-${node.id}-${node.right.id}`;
          steps.push({
            description: `${target} > ${node.value}, traversing to right child`,
            pseudocodeLine: 6,
            action: async () => {
              this.renderTree(null, node.id, null, null, [...currentEdges, nextEdgeId]);
            }
          });
          edges.push(nextEdgeId);
          path.push(node.id);
          current = node.right;
        } else {
          steps.push({
            description: `${target} > ${node.value}, but right child is null. Element not found.`,
            pseudocodeLine: 1,
            action: async () => {
              this.renderTree(null, null, null, node.id, currentEdges);
            }
          });
          break;
        }
      }
    }

    this.engine.setSteps(steps);
    this._updatePlaybackControls();
  }

  _generateInsertSteps(val) {
    const code = [
      'function insert(node, x):',
      '  if node == null:',
      '    return new Node(x)',
      '  if x < node.value:',
      '    node.left = insert(node.left, x)',
      '  else if x > node.value:',
      '    node.right = insert(node.right, x)',
      '  return node'
    ];
    this.pseudocode.setCode(code);
    this.log.clear();
    this.log.addEntry(`Inserting element x = ${val} optimally in the BST`, 'action');

    const steps = [];
    let current = this.root;
    let pathEdges = [];

    // Helper clone tree for state tracking in actions
    const cloneTree = (node) => {
      if (!node) return null;
      const clone = new BSTNode(node.value, node.id);
      clone.left = cloneTree(node.left);
      clone.right = cloneTree(node.right);
      return clone;
    };

    if (!current) {
      steps.push({
        description: 'Tree is empty. Creating root node.',
        pseudocodeLine: 2,
        action: async () => {
          this.root = new BSTNode(val, this.nodeCounter++);
          this.renderTree();
          const el = document.getElementById(`node-${this.nodeCounter - 1}`);
          if (el) el.classList.add('new-node');
        }
      });
      this.engine.setSteps(steps);
      return;
    }

    // Build steps list
    let prevNode = null;
    let direction = '';

    while (current) {
      const node = current;
      const currentEdges = [...pathEdges];

      steps.push({
        description: `Comparing value ${val} with current node ${node.value}`,
        pseudocodeLine: 3,
        action: async () => {
          this.renderTree(null, node.id, null, null, currentEdges);
        }
      });

      if (val === node.value) {
        steps.push({
          description: `Value ${val} already exists in tree. BST doesn't insert duplicates.`,
          pseudocodeLine: 3,
          action: async () => {}
        });
        this.engine.setSteps(steps);
        return;
      }

      prevNode = node;
      if (val < node.value) {
        if (node.left) {
          const edgeId = `edge-${node.id}-${node.left.id}`;
          pathEdges.push(edgeId);
          current = node.left;
        } else {
          direction = 'left';
          break;
        }
      } else {
        if (node.right) {
          const edgeId = `edge-${node.id}-${node.right.id}`;
          pathEdges.push(edgeId);
          current = node.right;
        } else {
          direction = 'right';
          break;
        }
      }
    }

    // Node is inserted as a child of prevNode
    const newId = this.nodeCounter++;
    const currentEdgesFinal = [...pathEdges];
    
    steps.push({
      description: `Inserting new node ${val} under ${prevNode.value} (${direction})`,
      pseudocodeLine: 2,
      action: async () => {
        const newNode = new BSTNode(val, newId);
        if (direction === 'left') prevNode.left = newNode;
        else prevNode.right = newNode;

        this.renderTree(null, null, newId, null, [...currentEdgesFinal, `edge-${prevNode.id}-${newId}`]);
        const el = document.getElementById(`node-${newId}`);
        if (el) el.classList.add('new-node');
      }
    });

    this.engine.setSteps(steps);
    this._updatePlaybackControls();
  }

  _generateDeleteSteps(val) {
    const code = [
      'function delete(node, x):',
      '  if node == null: return null',
      '  if x < node.value:',
      '    node.left = delete(node.left, x)',
      '  else if x > node.value:',
      '    node.right = delete(node.right, x)',
      '  else: // Node found!',
      '    if node.left == null: return node.right',
      '    if node.right == null: return node.left',
      '    successor = findMin(node.right)',
      '    node.value = successor.value',
      '    node.right = delete(node.right, successor.value)'
    ];
    this.pseudocode.setCode(code);
    this.log.clear();
    this.log.addEntry(`Deleting element x = ${val} optimally from the BST`, 'action');

    const steps = [];
    let current = this.root;
    let pathEdges = [];

    // First search for the node
    let foundNode = null;
    let parent = null;

    while (current) {
      const node = current;
      const currentEdges = [...pathEdges];
      steps.push({
        description: `Comparing value ${val} with current node ${node.value}`,
        pseudocodeLine: 2,
        action: async () => {
          this.renderTree(null, node.id, null, null, currentEdges);
        }
      });

      if (val === node.value) {
        foundNode = node;
        break;
      }

      parent = node;
      if (val < node.value) {
        if (node.left) {
          pathEdges.push(`edge-${node.id}-${node.left.id}`);
          current = node.left;
        } else {
          break;
        }
      } else {
        if (node.right) {
          pathEdges.push(`edge-${node.id}-${node.right.id}`);
          current = node.right;
        } else {
          break;
        }
      }
    }

    if (!foundNode) {
      steps.push({
        description: `Element ${val} not found in the BST. Nothing to delete.`,
        pseudocodeLine: 2,
        action: async () => {}
      });
      this.engine.setSteps(steps);
      return;
    }

    steps.push({
      description: `Node with value ${val} found. Processing deletion.`,
      pseudocodeLine: 6,
      action: async () => {
        this.renderTree(foundNode.id, null, null, null, pathEdges);
      }
    });

    // Helper functions to handle tree updates in state
    const removeNodeInState = (v) => {
      const removeHelper = (node, x) => {
        if (!node) return null;
        if (x < node.value) node.left = removeHelper(node.left, x);
        else if (x > node.value) node.right = removeHelper(node.right, x);
        else {
          if (!node.left) return node.right;
          if (!node.right) return node.left;
          
          // Two children
          let minNode = node.right;
          while (minNode.left) minNode = minNode.left;
          node.value = minNode.value;
          node.right = removeHelper(node.right, minNode.value);
        }
        return node;
      };
      this.root = removeHelper(this.root, v);
    };

    if (!foundNode.left && !foundNode.right) {
      // Case 1: Leaf Node
      steps.push({
        description: `Node ${val} is a leaf node. Removing it directly.`,
        pseudocodeLine: 7,
        action: async () => {
          const el = document.getElementById(`node-${foundNode.id}`);
          if (el) {
            el.classList.add('deleting');
          }
        }
      });
      steps.push({
        description: `Updating BST connections.`,
        pseudocodeLine: 7,
        action: async () => {
          removeNodeInState(val);
          this.renderTree();
        }
      });
    } else if (!foundNode.left || !foundNode.right) {
      // Case 2: One child
      const child = foundNode.left ? foundNode.left : foundNode.right;
      steps.push({
        description: `Node ${val} has one child (${child.value}). Replacing node with its child.`,
        pseudocodeLine: 7,
        action: async () => {
          const el = document.getElementById(`node-${foundNode.id}`);
          if (el) el.classList.add('deleting');
        }
      });
      steps.push({
        description: `Re-wiring tree pointers.`,
        pseudocodeLine: 7,
        action: async () => {
          removeNodeInState(val);
          this.renderTree();
        }
      });
    } else {
      // Case 3: Two children
      // Find successor (minimum in right subtree)
      let succParent = foundNode;
      let successor = foundNode.right;
      let succEdges = [`edge-${foundNode.id}-${successor.id}`];

      steps.push({
        description: `Node ${val} has two children. Finding in-order successor in right subtree.`,
        pseudocodeLine: 9,
        action: async () => {
          this.renderTree(foundNode.id, successor.id, null, null, [...pathEdges, ...succEdges]);
        }
      });

      while (successor.left) {
        const nextEdge = `edge-${successor.id}-${successor.left.id}`;
        succEdges.push(nextEdge);
        succParent = successor;
        successor = successor.left;
        steps.push({
          description: `Traversing left to find minimum value... checking ${successor.value}`,
          pseudocodeLine: 9,
          action: async () => {
            this.renderTree(foundNode.id, successor.id, null, null, [...pathEdges, ...succEdges]);
          }
        });
      }

      steps.push({
        description: `Found successor: ${successor.value}. Replacing value of target node.`,
        pseudocodeLine: 10,
        action: async () => {
          // Temporarily show successor copy value
          const targetEl = document.getElementById(`node-${foundNode.id}`);
          if (targetEl) targetEl.textContent = successor.value;
          const succEl = document.getElementById(`node-${successor.id}`);
          if (succEl) succEl.classList.add('deleting');
        }
      });

      steps.push({
        description: `Deleting successor node (${successor.value}) recursively.`,
        pseudocodeLine: 11,
        action: async () => {
          removeNodeInState(val); // this will copy successor value and remove successor node
          this.renderTree();
        }
      });
    }

    this.engine.setSteps(steps);
    this._updatePlaybackControls();
  }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  new BSTVisualizer();
});
