/* ============================================================
   Animation Engine
   Manages step-by-step playback for all DS visualizers.
   ============================================================ */

export class AnimationEngine {
  /**
   * @param {Object} options
   * @param {Function} options.onStep       - Called with (step, index) when a step executes
   * @param {Function} options.onComplete   - Called when all steps finish
   * @param {Function} options.onReset      - Called on reset
   */
  constructor(options = {}) {
    this.steps = [];
    this.currentStepIndex = -1;
    this.isPlaying = false;
    this.isPaused = false;
    this._playTimeoutId = null;

    // Speed: index maps to multiplier
    this.speedLevels = [1, 1.25, 1.5, 1.75, 2];
    this.speedIndex = 0;
    this.baseDelay = 800; // ms

    // Callbacks
    this.onStep = options.onStep || (() => {});
    this.onComplete = options.onComplete || (() => {});
    this.onReset = options.onReset || (() => {});
  }

  /* ---------- Step Management ---------- */

  /**
   * Load a sequence of animation steps.
   * Each step: { description, pseudocodeLine, action: async (engine) => {}, duration? }
   */
  setSteps(steps) {
    this.reset();
    this.steps = steps;
    this.currentStepIndex = -1;
  }

  get totalSteps() {
    return this.steps.length;
  }

  get hasNextStep() {
    return this.currentStepIndex < this.steps.length - 1;
  }

  get isComplete() {
    return this.currentStepIndex >= this.steps.length - 1;
  }

  /* ---------- Playback Controls ---------- */

  /**
   * Execute the next step and return a promise that resolves when the step is done.
   */
  async nextStep() {
    if (!this.hasNextStep) {
      this._finish();
      return null;
    }

    this.currentStepIndex++;
    const step = this.steps[this.currentStepIndex];

    // Notify listeners
    this.onStep(step, this.currentStepIndex);

    // Execute the step's action
    if (step.action) {
      await step.action(this);
    }

    // Wait for the step duration (adjusted by speed)
    const delay = this.getDelay(step.duration);
    await this._wait(delay);

    // If this was the last step, finish
    if (this.isComplete) {
      this._finish();
    }

    return step;
  }

  /**
   * Auto-play through all remaining steps.
   */
  async play() {
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.isPaused = false;

    while (this.hasNextStep && this.isPlaying) {
      await this.nextStep();
    }

    this.isPlaying = false;
  }

  /**
   * Pause auto-play.
   */
  pause() {
    this.isPlaying = false;
    this.isPaused = true;
    if (this._playTimeoutId) {
      clearTimeout(this._playTimeoutId);
      this._playTimeoutId = null;
    }
  }

  /**
   * Reset to initial state.
   */
  reset() {
    this.pause();
    this.currentStepIndex = -1;
    this.isPlaying = false;
    this.isPaused = false;
    this.steps = [];
    this.onReset();
  }

  /* ---------- Speed Control ---------- */

  /**
   * Set speed by index (0–4).
   */
  setSpeed(index) {
    this.speedIndex = Math.max(0, Math.min(index, this.speedLevels.length - 1));
  }

  get speed() {
    return this.speedLevels[this.speedIndex];
  }

  get speedLabel() {
    return `${this.speed}x`;
  }

  /**
   * Get delay in ms for a step, adjusted by current speed.
   * @param {number} [customDuration] - Override base delay for this step
   */
  getDelay(customDuration) {
    const base = customDuration || this.baseDelay;
    return base / this.speed;
  }

  /* ---------- Utilities ---------- */

  /**
   * Returns a promise that resolves after `ms` milliseconds.
   */
  _wait(ms) {
    return new Promise(resolve => {
      this._playTimeoutId = setTimeout(resolve, ms);
    });
  }

  /**
   * Await a delay (for use inside step actions).
   */
  wait(ms) {
    return this._wait(ms / this.speed);
  }

  _finish() {
    this.isPlaying = false;
    this.onComplete();
  }
}
