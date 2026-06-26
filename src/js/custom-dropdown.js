/* Custom dropdown — replaces native <select> */

export class CustomDropdown {
  /**
   * @param {HTMLElement} container - .custom-dropdown element
   * @param {{ value: string, label: string, icon?: string }[]} options
   * @param {(value: string) => void} onChange
   */
  constructor(container, options, onChange) {
    this.container = container;
    this.options = options;
    this.onChange = onChange;
    this.value = options[0]?.value || '';
    this.isOpen = false;
    this._render();
    this._bind();
  }

  setOptions(options) {
    this.options = options;
    if (!options.find(o => o.value === this.value)) {
      this.value = options[0]?.value || '';
    }
    this._render();
    this._bind();
  }

  getValue() {
    return this.value;
  }

  setValue(val) {
    this.value = val;
    this._updateTrigger();
  }

  _render() {
    const current = this.options.find(o => o.value === this.value) || this.options[0];
    this.container.innerHTML = `
      <button type="button" class="dropdown-trigger" aria-haspopup="listbox" aria-expanded="false">
        <span class="dropdown-icon">${current?.icon || '◆'}</span>
        <span class="dropdown-label">${current?.label || 'Select'}</span>
        <span class="dropdown-chevron">▾</span>
      </button>
      <ul class="dropdown-menu" role="listbox">
        ${this.options.map(o => `
          <li class="dropdown-item${o.value === this.value ? ' selected' : ''}"
              role="option" data-value="${o.value}" aria-selected="${o.value === this.value}">
            <span class="dropdown-icon">${o.icon || '◆'}</span>
            <span>${o.label}</span>
          </li>
        `).join('')}
      </ul>
    `;
    this.trigger = this.container.querySelector('.dropdown-trigger');
    this.menu = this.container.querySelector('.dropdown-menu');
  }

  _bind() {
    this.trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      this._toggle();
    });

    this.menu.querySelectorAll('.dropdown-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = item.dataset.value;
        if (val !== this.value) {
          this.value = val;
          this._updateTrigger();
          this.onChange(val);
        }
        this._close();
      });
    });

    if (!this.container.dataset.globalBound) {
      this.container.dataset.globalBound = 'true';
      document.addEventListener('click', () => this._close());
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this._close();
      });
    }
  }

  _updateTrigger() {
    const current = this.options.find(o => o.value === this.value);
    this.trigger.querySelector('.dropdown-label').textContent = current?.label || '';
    this.trigger.querySelector('.dropdown-icon').textContent = current?.icon || '◆';
    this.menu.querySelectorAll('.dropdown-item').forEach(el => {
      const sel = el.dataset.value === this.value;
      el.classList.toggle('selected', sel);
      el.setAttribute('aria-selected', sel);
    });
  }

  _toggle() {
    this.isOpen ? this._close() : this._open();
  }

  _open() {
    this.isOpen = true;
    this.container.classList.add('open');
    this.trigger.setAttribute('aria-expanded', 'true');
  }

  _close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.container.classList.remove('open');
    this.trigger.setAttribute('aria-expanded', 'false');
  }
}
