/* ============================================================
   UI Panels — Pseudocode + Operation Log
   Shared by all visualizer pages.
   ============================================================ */

/* ---------- Pseudocode Panel ---------- */

export class PseudocodePanel {
  /**
   * @param {string} bodyId   - ID of the .panel-body element
   */
  constructor(bodyId) {
    this.container = document.getElementById(bodyId);
    this.lines = [];
    this.activeIndex = -1;
  }

  /**
   * Set the pseudocode to display.
   * @param {string[]} lines - Array of code strings
   */
  setCode(lines) {
    this.lines = lines;
    this.activeIndex = -1;
    this._render();
  }

  /**
   * Highlight a specific line (0-indexed).
   */
  highlightLine(index) {
    if (index < 0 || index >= this.lines.length) return;

    // Remove previous highlight
    this.clearHighlight();

    this.activeIndex = index;
    const lineEl = this.container.querySelector(`[data-line="${index}"]`);
    if (lineEl) {
      lineEl.classList.add('active');
      // Scroll into view smoothly
      lineEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /**
   * Remove all highlights.
   */
  clearHighlight() {
    this.activeIndex = -1;
    const active = this.container.querySelectorAll('.pseudocode-line.active');
    active.forEach(el => el.classList.remove('active'));
  }

  /**
   * Clear everything.
   */
  reset() {
    this.lines = [];
    this.activeIndex = -1;
    this.container.innerHTML = '';
  }

  /* -- Private -- */

  _render() {
    this.container.innerHTML = this.lines
      .map((line, i) => `
        <div class="pseudocode-line" data-line="${i}">
          <span class="line-num">${i + 1}</span>
          <span class="line-code">${this._escapeHtml(line)}</span>
        </div>
      `)
      .join('');
  }

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}


/* ---------- Log Panel ---------- */

export class LogPanel {
  /**
   * @param {string} bodyId     - ID of the .panel-body element for log content
   * @param {string} clearBtnId - ID of the clear button
   */
  constructor(bodyId, clearBtnId) {
    this.container = document.getElementById(bodyId);
    this.clearBtn = document.getElementById(clearBtnId);
    this.entries = [];

    if (this.clearBtn) {
      this.clearBtn.addEventListener('click', () => this.clear());
    }

    this._showEmpty();
  }

  /**
   * Add a log entry.
   * @param {string} text - Log message
   * @param {'info'|'action'|'success'|'error'|'warning'|'highlight'} type
   */
  addEntry(text, type = 'info') {
    // Remove empty state
    const empty = this.container.querySelector('.log-empty');
    if (empty) empty.remove();

    const icons = {
      info:      '📋',
      action:    '▶',
      success:   '✓',
      error:     '✗',
      warning:   '⚠',
      highlight: '★',
    };

    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerHTML = `
      <span class="log-icon">${icons[type] || '•'}</span>
      <span class="log-text">${text}</span>
    `;

    this.container.appendChild(entry);
    this.entries.push(entry);

    // Auto-scroll to bottom
    this.container.scrollTop = this.container.scrollHeight;
  }

  /**
   * Clear all log entries.
   */
  clear() {
    this.container.innerHTML = '';
    this.entries = [];
    this._showEmpty();
  }

  _showEmpty() {
    this.container.innerHTML = '<div class="log-empty">Operations will appear here…</div>';
  }
}
