/* UI Panels — Pseudocode, Log, Stack/Queue */

const KEYWORDS = new Set([
  'function', 'return', 'if', 'else', 'elif', 'for', 'while', 'do',
  'new', 'true', 'false', 'null', 'not', 'and', 'or', 'break', 'continue',
  'var', 'let', 'const', 'to', 'downto', 'mod',
]);

export class PseudocodePanel {
  constructor(bodyId) {
    this.container = document.getElementById(bodyId);
    this.lines = [];
    this.activeIndex = -1;
  }

  setCode(lines) {
    this.lines = lines;
    this.activeIndex = -1;
    this._render();
  }

  highlightLine(index) {
    if (index < 0 || index >= this.lines.length) return;
    this.clearHighlight();
    this.activeIndex = index;
    const lineEl = this.container.querySelector(`[data-line="${index}"]`);
    if (lineEl) {
      lineEl.classList.add('active');
      this._scrollLineIntoView(lineEl);
    }
  }

  _scrollLineIntoView(lineEl) {
    const panel = this.container;
    const lineTop = lineEl.offsetTop;
    const lineBottom = lineTop + lineEl.offsetHeight;
    const viewTop = panel.scrollTop;
    const viewBottom = viewTop + panel.clientHeight;
    if (lineTop < viewTop) {
      panel.scrollTop = lineTop - 8;
    } else if (lineBottom > viewBottom) {
      panel.scrollTop = lineBottom - panel.clientHeight + 8;
    }
  }

  clearHighlight() {
    this.activeIndex = -1;
    this.container.querySelectorAll('.pseudocode-line.active').forEach(el => {
      el.classList.remove('active');
    });
  }

  reset() {
    this.lines = [];
    this.activeIndex = -1;
    this.container.innerHTML = '<div class="pseudocode-empty">Run an operation to see pseudocode…</div>';
  }

  _render() {
    if (!this.lines.length) {
      this.container.innerHTML = '<div class="pseudocode-empty">Run an operation to see pseudocode…</div>';
      return;
    }

    this.container.innerHTML = this.lines.map((line, i) => {
      const { indent, content, type } = this._parseLine(line);
      return `
        <div class="pseudocode-line" data-line="${i}" style="--indent: ${indent}">
          <span class="line-num">${String(i + 1).padStart(2, '0')}</span>
          <span class="line-code${type ? ` line-${type}` : ''}">${this._formatCode(content)}</span>
        </div>
      `;
    }).join('');
  }

  _parseLine(line) {
    const trimmed = line.trimStart();
    const spaces = line.length - trimmed.length;
    const indent = Math.floor(spaces / 2);
    if (trimmed.startsWith('//') || trimmed.startsWith('#')) {
      return { indent, content: trimmed, type: 'comment' };
    }
    return { indent, content: trimmed, type: '' };
  }

  _formatCode(str) {
    const parts = str.split(/(\b[a-zA-Z_]\w*\b|\b\d+\b|'[^']*'|"[^"]*"|[^\s\w]+|\s+)/g).filter(p => p !== '');
    return parts.map(part => {
      if (KEYWORDS.has(part)) {
        return `<span class="tok-keyword">${this._escapeHtml(part)}</span>`;
      }
      if (/^\d+$/.test(part)) {
        return `<span class="tok-number">${part}</span>`;
      }
      if (/^['"]/.test(part)) {
        return `<span class="tok-string">${this._escapeHtml(part)}</span>`;
      }
      return this._escapeHtml(part);
    }).join('');
  }

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

export class LogPanel {
  constructor(bodyId, clearBtnId) {
    this.container = document.getElementById(bodyId);
    this.clearBtn = document.getElementById(clearBtnId);
    this.stepCount = 0;
    if (this.clearBtn) this.clearBtn.addEventListener('click', () => this.clear());
    this._showEmpty();
  }

  addEntry(text, type = 'info') {
    const empty = this.container.querySelector('.log-empty');
    if (empty) empty.remove();

    this.stepCount++;
    const icons = {
      info: '○', action: '▸', success: '✓', error: '✕',
      warning: '⚠', highlight: '★',
    };

    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerHTML = `
      <span class="log-step">${String(this.stepCount).padStart(2, '0')}</span>
      <span class="log-icon">${icons[type] || '•'}</span>
      <span class="log-text">${this._escapeHtml(text)}</span>
    `;
    this.container.appendChild(entry);
    this.container.scrollTop = this.container.scrollHeight;
  }

  clear() {
    this.stepCount = 0;
    this.container.innerHTML = '';
    this._showEmpty();
  }

  _showEmpty() {
    this.container.innerHTML = `
      <div class="log-empty">
        <span class="log-empty-icon">📝</span>
        <span>Step-by-step operations will appear here</span>
      </div>`;
  }

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

export class AuxStructurePanel {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.items = [];
    this.type = 'queue';
    this.label = '';
    this.visible = false;
    this.stackHints = {};
    this.queueHints = {};
    this._render();
  }

  show(type, label = '') {
    this.type = type;
    this.label = label;
    this.visible = true;
    this.stackHints = {};
    this.queueHints = {};
    this._render();
  }

  hide() {
    this.visible = false;
    this.items = [];
    this.stackHints = {};
    this.queueHints = {};
    this._render();
  }

  setType(type) {
    this.type = type;
    this.visible = true;
    this._render();
  }

  setItems(items) {
    this.items = [...items];
    this.stackHints = {};
    this.queueHints = {};
    this.visible = true;
    this._render();
  }

  setStack(items, hints = {}) {
    this.type = 'stack';
    this.items = [...items];
    this.stackHints = { ...hints };
    this.queueHints = {};
    this.visible = true;
    this._render();
  }

  setQueue(items, hints = {}) {
    this.type = 'queue';
    this.items = [...items];
    this.queueHints = { ...hints };
    this.stackHints = {};
    this.visible = true;
    this._render();
  }

  reset() {
    this.items = [];
    this.stackHints = {};
    this.queueHints = {};
    this.visible = false;
    this._render();
  }

  _render() {
    if (!this.container) return;

    if (!this.visible) {
      this.container.innerHTML = '';
      this.container.classList.remove('aux-visible');
      return;
    }

    this.container.classList.add('aux-visible');
    const isStack = this.type === 'stack';
    const title = this.label || (isStack ? 'Stack' : 'Queue');

    if (isStack) {
      const { popped, highlightTop } = this.stackHints;
      const topDown = [...this.items].reverse();

      this.container.innerHTML = `
        <div class="aux-structure aux-stack-viz">
          <div class="aux-header">
            <span class="aux-icon">⬡</span>
            <span class="aux-title">${title}</span>
            <span class="aux-badge">LIFO</span>
          </div>
          <div class="aux-stack-body">
            <div class="aux-stack-label">TOP ↓</div>
            ${popped != null ? `
              <div class="aux-popped-zone">
                <span class="aux-popped-label">popped</span>
                <div class="aux-stack-cell popped">${this._escape(popped)}</div>
              </div>` : ''}
            <div class="aux-stack-items">
              ${topDown.length ? topDown.map((item, i) => {
                const isTop = i === 0;
                const cls = [
                  'aux-stack-cell',
                  isTop && highlightTop ? 'active' : '',
                  isTop && popped != null ? 'removing' : '',
                ].filter(Boolean).join(' ');
                return `<div class="${cls}"><span class="aux-cell-value">${this._escape(item)}</span></div>`;
              }).join('') : '<div class="aux-empty-state">∅ empty</div>'}
            </div>
            <div class="aux-stack-base">BOTTOM</div>
          </div>
        </div>`;
    } else {
      const { dequeued, highlightFront, highlightRear } = this.queueHints;
      const cells = this.items.map((item, i) => {
        const isFront = i === 0;
        const isRear = i === this.items.length - 1;
        const cls = [
          'aux-queue-cell',
          isFront && highlightFront ? 'active front' : '',
          isRear && highlightRear ? 'active rear' : '',
        ].filter(Boolean).join(' ');
        const arrow = i < this.items.length - 1 ? '<span class="aux-queue-arrow">→</span>' : '';
        return `
          <div class="aux-queue-slot">
            ${isFront ? '<span class="aux-pointer">front</span>' : ''}
            <div class="${cls}"><span class="aux-cell-value">${this._escape(item)}</span></div>
            ${isRear && this.items.length > 1 ? '<span class="aux-pointer rear">rear</span>' : ''}
            ${arrow}
          </div>`;
      }).join('');

      this.container.innerHTML = `
        <div class="aux-structure aux-queue-viz">
          <div class="aux-header">
            <span class="aux-icon">⬡</span>
            <span class="aux-title">${title}</span>
            <span class="aux-badge">FIFO</span>
          </div>
          <div class="aux-queue-body">
            <div class="aux-queue-labels">
              <span>FRONT</span>
              <span>REAR</span>
            </div>
            ${dequeued != null ? `
              <div class="aux-dequeued-zone">
                <div class="aux-queue-cell dequeued">${this._escape(dequeued)}</div>
                <span class="aux-dequeued-label">dequeued</span>
              </div>` : ''}
            <div class="aux-queue-track">
              ${cells || '<div class="aux-empty-state">∅ empty</div>'}
            </div>
          </div>
        </div>`;
    }
  }

  _escape(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }
}
