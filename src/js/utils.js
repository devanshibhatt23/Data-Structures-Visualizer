/* Defaults & random generation */

export const DEFAULTS = {
  array: [5, 12, 8, 3, 21, 17],
  linkedList: [10, 20, 30, 40, 50],
  bst: [45, 25, 65, 15, 35, 55, 75],
  graph: {
    n: 8,
    m: 10,
    directed: true,
    weighted: false,
    adjacency: ['2, 3', '3, 5', '4, 5', '5', '6', '6, 7', '7', ''],
  },
};

export function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function randomArray(length = 6, min = 1, max = 99) {
  const len = length || randomInt(5, 8);
  const values = new Set();
  while (values.size < len) values.add(randomInt(min, max));
  return [...values];
}

export function randomLinkedList(length = 5) {
  return randomArray(length, 5, 99);
}

export function randomBSTValues(count = 7) {
  const values = randomArray(count, 10, 99);
  return shuffle(values);
}

/** Build a connected undirected graph with valid adjacency lists */
export function randomGraph(n = 5) {
  n = Math.max(3, Math.min(n, 8));
  const adj = Array.from({ length: n }, () => []);

  for (let i = 1; i < n; i++) {
    const parent = randomInt(0, i - 1);
    adj[parent].push(i);
    adj[i].push(parent);
  }

  const extra = randomInt(1, n);
  for (let e = 0; e < extra; e++) {
    const u = randomInt(0, n - 1);
    const v = randomInt(0, n - 1);
    if (u !== v && !adj[u].includes(v)) {
      adj[u].push(v);
      adj[v].push(u);
    }
  }

  adj.forEach(row => row.sort((a, b) => a - b));

  let edgeCount = 0;
  const seen = new Set();
  for (let u = 0; u < n; u++) {
    for (const v of adj[u]) {
      const key = u < v ? `${u}-${v}` : `${v}-${u}`;
      if (!seen.has(key)) { seen.add(key); edgeCount++; }
    }
  }

  return {
    n,
    m: edgeCount,
    directed: false,
    weighted: false,
    adjacency: adj.map(row => row.join(', ')),
  };
}

export function randomWeightedGraph(n = 5) {
  const base = randomGraph(n);
  const adj = base.adjacency.map((line, u) => {
    if (!line.trim()) return '';
    return line.split(',').map(s => {
      const v = parseInt(s.trim());
      const w = randomInt(1, 15);
      return `(${v}, ${w})`;
    }).join(', ');
  });
  return { ...base, weighted: true, adjacency: adj };
}

export function generateDAG(n = null) {
  // Always generate 7–10 nodes for a meaningful DAG visualization
  n = (n == null) ? randomInt(7, 8) : Math.max(7, Math.min(n, 10));
  const adj = Array.from({ length: n }, () => []);

  const numLayers = Math.min(4, Math.max(3, Math.ceil(n / 2)));
  const layers = Array.from({ length: numLayers }, () => []);
  const counts = Array(numLayers).fill(1);
  let remaining = n - numLayers;

  for (let i = 1; i < numLayers - 1 && remaining > 0; i++) {
    const add = Math.min(remaining, randomInt(0, 2));
    counts[i] += add;
    remaining -= add;
  }
  if (remaining > 0) counts[numLayers - 1] += remaining;

  let nodeId = 0;
  for (let l = 0; l < numLayers; l++) {
    for (let i = 0; i < counts[l]; i++) layers[l].push(nodeId++);
  }

  const edges = new Set();
  const addEdge = (u, v) => {
    if (u < v && !adj[u].includes(v)) {
      adj[u].push(v);
      edges.add(`${u}-${v}`);
    }
  };

  for (let l = 0; l < numLayers - 1; l++) {
    const from = layers[l];
    const to = layers[l + 1];

    from.forEach(u => addEdge(u, to[randomInt(0, to.length - 1)]));

    to.forEach(v => {
      if (!from.some(u => adj[u].includes(v))) {
        addEdge(from[randomInt(0, from.length - 1)], v);
      }
    });

    from.forEach(u => {
      to.forEach(v => {
        if (Math.random() < 0.4) addEdge(u, v);
      });
    });
  }

  adj.forEach(row => row.sort((a, b) => a - b));

  return {
    n,
    m: edges.size,
    directed: true,
    weighted: false,
    adjacency: adj.map(row => row.join(', ')),
  };
}

export function generateWeightedDAG(n = null) {
  const base = generateDAG(n);
  const adj = base.adjacency.map(line => {
    if (!line.trim()) return '';
    return line.split(',').map(s => {
      const v = parseInt(s.trim());
      return `(${v}, ${randomInt(1, 12)})`;
    }).join(', ');
  });
  return { ...base, weighted: true, adjacency: adj };
}

export function parseIntList(str, fallback) {
  if (!str || !str.trim()) return [...fallback];
  const parts = str.split(',').map(s => s.trim()).filter(Boolean);
  if (!parts.every(p => /^-?\d+$/.test(p))) return null;
  return parts;
}
