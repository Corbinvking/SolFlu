export const ANIMATION_STATES = {
  PLAYING: 'playing',
  PAUSED: 'paused',
  STOPPED: 'stopped'
};

export class AnimationController {
  constructor() {
    this.animationState = ANIMATION_STATES.STOPPED;
    this.currentTime = 0;
    this.duration = 1000;
    this.onFrame = null;
    this.animationFrameId = null;
    this.startTime = null;
    this.loop = true;
  }

  setDuration(duration) {
    this.duration = duration;
  }

  setOnFrame(callback) {
    this.onFrame = callback;
  }

  play() {
    if (this.animationState !== ANIMATION_STATES.PLAYING) {
      this.animationState = ANIMATION_STATES.PLAYING;
      this.startTime = performance.now();
      this.animate(this.startTime);
    }
  }

  pause() {
    this.animationState = ANIMATION_STATES.PAUSED;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  stop() {
    this.animationState = ANIMATION_STATES.STOPPED;
    this.currentTime = 0;
    this.startTime = null;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.onFrame) {
      this.onFrame(0);
    }
  }

  animate(timestamp) {
    if (this.animationState !== ANIMATION_STATES.PLAYING) return;

    if (!this.startTime) {
      this.startTime = timestamp;
    }

    const elapsed = timestamp - this.startTime;
    let progress = (elapsed % this.duration) / this.duration;

    if (this.onFrame) {
      this.onFrame(progress);
    }

    // Request next frame immediately to maintain animation
    this.animationFrameId = requestAnimationFrame((t) => this.animate(t));
  }
} 