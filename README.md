# Data Structures Visualizer

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-F7DF1E?logo=javascript&logoColor=black)

A browser-based tool to learn and explore Data Structures and Algorithms through interactive, step-by-step animations. Built entirely with vanilla HTML, CSS, and JavaScript — no frameworks, no dependencies, no build step.

---

## Table of Contents

1. [Core Features](#core-features)
2. [Data Structures Covered](#data-structures-covered)
3. [Screenshots](#screenshots)
4. [Architecture Overview](#architecture-overview)
5. [Project Structure](#project-structure)
6. [Tech Stack](#tech-stack)
7. [Setup and Installation](#setup-and-installation)

---

## Core Features

### Step-by-step Animation Engine

- Play, Pause, and Reset controls for full control over each animation
- Speed slider to adjust animation pace across five levels
- Each operation is broken into individual steps so nothing happens all at once

### Pseudocode Panel

- Displays the relevant pseudocode for the selected operation
- Highlights the current line in real time as the animation progresses
- Helps connect what is happening visually to what the algorithm is actually doing

### Operation Log

- A live sidebar that prints a plain-English description of each step
- Explains comparisons, pointer movements, insertions, and deletions as they happen
- Auto-scrolls to the latest entry

### Color-coded Visualization

- Default nodes are shown in blue
- The current node being processed is highlighted in red
- Visited nodes turn green
- A successfully found node is highlighted in yellow

### Mobile-friendly Layout

- Tabbed panel system on smaller screens (Visual, Code, Log)
- Responsive design that adapts across desktop and mobile viewports

---

## Data Structures Covered

| Data Structure | Operations |
|---|---|
| Array | Create, Insert at index, Delete at index |
| Linked List | Insert at head/position, Delete, Search |
| Binary Search Tree | Insert, Delete, Search |
| Graph | BFS Traversal, DFS Traversal |

---

## Screenshots

Home Page

<img width="2940" height="1604" alt="WhatsApp Image 2026-06-26 at 17 21 14" src="https://github.com/user-attachments/assets/4c33c696-a5df-4b0e-9a25-480f8306e494" />


<img width="2940" height="1617" alt="WhatsApp Image 2026-06-26 at 17 21 14 (1)" src="https://github.com/user-attachments/assets/b67dbe88-334d-4386-93ed-18f89bb2ee7e" />


Array Visualizer

<img width="2940" height="1623" alt="WhatsApp Image 2026-06-26 at 17 21 15" src="https://github.com/user-attachments/assets/29abddf7-d4d2-44bf-949d-f759e0e60b0b" />


Linked List Visualizer

<img width="2940" height="1600" alt="WhatsApp Image 2026-06-26 at 17 21 14 (2)" src="https://github.com/user-attachments/assets/8e9c24ed-a4da-4750-9bf3-b47506ae53ca" />


Binary Search Tree (BST) Visualizer

<img width="2940" height="1618" alt="WhatsApp Image 2026-06-26 at 17 21 15 (1)" src="https://github.com/user-attachments/assets/226c06a5-e0b7-4502-a70e-6c37593caf21" />


Graph Visualizer

<img width="2940" height="1595" alt="WhatsApp Image 2026-06-26 at 17 21 15 (2)" src="https://github.com/user-attachments/assets/8ffb24aa-9d02-4673-90fd-a5884eb9538e" />


<img width="2940" height="1613" alt="WhatsApp Image 2026-06-26 at 17 21 15 (3)" src="https://github.com/user-attachments/assets/b8c9806a-bc6d-4c44-a1ff-f3a39b97d600" />


---

## Architecture Overview

Since this is a pure frontend project with no backend, the entire application runs in the browser. Each visualizer page operates independently with its own JavaScript module.

```
Browser
│
├── index.html                  ← Landing page, navigation hub
│
├── array.html / array-visualizer.js
│   ├── Renders array blocks with index labels
│   ├── Manages create / insert / delete step queues
│   └── Drives pseudocode highlight and log updates
│
├── linked-list.html / linked-list-visualizer.js
│   ├── Renders node boxes connected by pointer arrows
│   └── Animates head/tail insert, delete, traverse
│
├── bst.html / bst-visualizer.js
│   ├── Draws tree nodes on an SVG canvas with edge lines
│   └── Animates insert and search with comparisons highlighted
│
├── graph.html / graph-visualizer.js
│   ├── Renders adjacency-based node graph on canvas
│   └── Runs BFS and DFS with visited state coloring
│
└── css/styles.css              ← Shared dark theme, animations, layout
```

---

## Project Structure

```
Data-Structures-Visualizer/
├── index.html                   # Landing page with navigation cards
├── array.html                   # Array visualizer page
├── linked-list.html             # Linked list visualizer page
├── bst.html                     # Binary search tree visualizer page
├── graph.html                   # Graph visualizer page
├── css/
│   └── styles.css               # Shared stylesheet for all pages
├── js/
│   ├── array-visualizer.js      # Array logic and animation engine
│   ├── linked-list-visualizer.js
│   ├── bst-visualizer.js
│   └── graph-visualizer.js
└── assets/
    └── favicon.svg
```

---

## Tech Stack

- **HTML5** — Page structure and semantic markup
- **CSS3** — Dark theme, transitions, keyframe animations, responsive layout
- **JavaScript (ES6 modules)** — Algorithm logic, DOM manipulation, animation step queues

No external libraries. No package manager. No build tools.

---

## Setup and Installation

Since the project has no server or build dependencies, setup is a single step.

**Clone the repository**

```bash
git clone https://github.com/devanshibhatt23/Data-Structures-Visualizer.git
```

**Open in browser**

```bash
cd Data-Structures-Visualizer
open index.html
```

Or simply double-click `index.html` in your file explorer. The application runs entirely in the browser.

---
