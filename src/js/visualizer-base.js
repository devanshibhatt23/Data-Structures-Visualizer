/* Shared visualizer setup helpers */

export function setupMobileTabs() {
  const tabs = document.querySelectorAll('.mobile-panel-tabs button');
  const panels = {
    canvas: document.getElementById('canvas-area'),
    pseudocode: document.getElementById('pseudocode-panel'),
    log: document.getElementById('log-panel'),
  };
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      Object.values(panels).forEach(p => p?.classList.remove('mobile-visible'));
      const panelId = tab.dataset.panel;
      if (panels[panelId]) panels[panelId].classList.add('mobile-visible');
    });
  });
}

export function setupProgress(engine, barEl, canvasEl) {
  if (!barEl) return null;
  return {
    onStep(_step, index) {
      const total = engine.totalSteps;
      barEl.style.width = total > 0 ? `${((index + 1) / total) * 100}%` : '0%';
    },
    onComplete() {
      barEl.style.width = '100%';
    },
    onReset() {
      barEl.style.width = '0%';
    },
  };
}

export function setupPlaybackButtons(viz) {
  const update = () => viz._updatePlaybackControls();

  viz.engine.onPlaybackChange = update;

  viz.playBtn.addEventListener('click', () => viz.engine.play());
  viz.pauseBtn.addEventListener('click', () => viz.engine.pause());
}

export function setupSpeedControl(engine, slider, label) {
  label.textContent = engine.speedLabel;
  slider.addEventListener('input', () => {
    engine.setSpeed(parseInt(slider.value));
    label.textContent = engine.speedLabel;
  });
}

/** Debounced fit-to-screen — avoids layout shake during step animations */
export function setupFitToScreen(container, canvasArea, innerSelector) {
  let rafId = null;
  let lastScale = null;

  const apply = () => {
    rafId = null;
    const inner = container?.querySelector(innerSelector);
    if (!inner || !canvasArea) return;

    const canvasWidth = canvasArea.clientWidth - 64;
    const scrollWidth = inner.scrollWidth;
    const scale = scrollWidth > canvasWidth && scrollWidth > 0
      ? canvasWidth / scrollWidth
      : 1;

    if (lastScale !== null && Math.abs(scale - lastScale) < 0.02) return;
    lastScale = scale;

    container.style.transform = scale < 1 ? `scale(${scale})` : '';
  };

  const schedule = () => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(apply);
  };

  const observer = new MutationObserver((mutations) => {
    const structural = mutations.some(m => m.type === 'childList');
    if (structural) schedule();
  });

  if (container) {
    observer.observe(container, { childList: true, subtree: false });
  }
  window.addEventListener('resize', schedule);
  schedule();

  return () => {
    observer.disconnect();
    window.removeEventListener('resize', schedule);
    if (rafId) cancelAnimationFrame(rafId);
  };
}
