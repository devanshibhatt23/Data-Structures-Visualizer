/* Animation Engine — step-by-step playback */

export class AnimationEngine {
  constructor(options = {}) {
    this.steps = [];
    this.currentStepIndex = -1;
    this.isPlaying = false;
    this.isPaused = false;
    this._playTimeoutId = null;
    this._waitResolve = null;

    this.speedLevels = [1, 1.25, 1.5, 1.75, 2];
    this.speedIndex = 0;
    this.baseDelay = 800;

    this.onStep = options.onStep || (() => {});
    this.onComplete = options.onComplete || (() => {});
    this.onReset = options.onReset || (() => {});
    this.onPlaybackChange = options.onPlaybackChange || (() => {});
  }

  setSteps(steps) {
    this._abortWait();
    this.isPlaying = false;
    this.isPaused = false;
    this.currentStepIndex = -1;
    this.steps = steps;
    this._notifyPlayback();
  }

  get totalSteps() {
    return this.steps.length;
  }

  get hasNextStep() {
    return this.currentStepIndex < this.steps.length - 1;
  }

  get canResume() {
    return this.steps.length > 0 && this.hasNextStep && !this.isPlaying;
  }

  get isComplete() {
    return this.steps.length > 0 && this.currentStepIndex >= this.steps.length - 1;
  }

  async nextStep() {
    if (!this.hasNextStep) {
      this._finish();
      return null;
    }

    this.currentStepIndex++;
    const step = this.steps[this.currentStepIndex];
    this.onStep(step, this.currentStepIndex);

    if (step.action) {
      await step.action(this);
    }

    if (!this.isPlaying) {
      this._notifyPlayback();
      return step;
    }

    const delay = this.getDelay(step.duration);
    await this._wait(delay);

    if (!this.isPlaying) {
      this._notifyPlayback();
      return step;
    }

    if (this.isComplete) {
      this._finish();
    }

    return step;
  }

  async play() {
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.isPaused = false;
    this._notifyPlayback();

    while (this.hasNextStep && this.isPlaying) {
      await this.nextStep();
    }

    this.isPlaying = false;
    this._notifyPlayback();
  }

  pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.isPaused = true;
    this._abortWait();
    this._notifyPlayback();
  }

  reset() {
    this.pause();
    this.currentStepIndex = -1;
    this.isPlaying = false;
    this.isPaused = false;
    this.steps = [];
    this.onReset();
    this._notifyPlayback();
  }

  setSpeed(index) {
    this.speedIndex = Math.max(0, Math.min(index, this.speedLevels.length - 1));
  }

  get speed() {
    return this.speedLevels[this.speedIndex];
  }

  get speedLabel() {
    return `${this.speed}x`;
  }

  getDelay(customDuration) {
    const base = customDuration || this.baseDelay;
    return base / this.speed;
  }

  _wait(ms) {
    return new Promise(resolve => {
      this._waitResolve = resolve;
      this._playTimeoutId = setTimeout(() => {
        this._playTimeoutId = null;
        this._waitResolve = null;
        resolve();
      }, ms);
    });
  }

  _abortWait() {
    if (this._playTimeoutId) {
      clearTimeout(this._playTimeoutId);
      this._playTimeoutId = null;
    }
    if (this._waitResolve) {
      const resolve = this._waitResolve;
      this._waitResolve = null;
      resolve();
    }
  }

  wait(ms) {
    return this._wait(ms / this.speed);
  }

  _finish() {
    this.isPlaying = false;
    this.isPaused = false;
    this.onComplete();
    this._notifyPlayback();
  }

  _notifyPlayback() {
    this.onPlaybackChange();
  }
}
