export class AnimationController {
    constructor() {
        this.duration = 1000;
        this.onFrame = null;
        this.startTime = null;
        this.animationFrame = null;
        this.isRunning = false;
    }

    setDuration(duration) {
        this.duration = duration;
    }

    setOnFrame(callback) {
        this.onFrame = callback;
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.startTime = performance.now();
        this.animate();
    }

    stop() {
        this.isRunning = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    animate = (timestamp) => {
        if (!this.isRunning) return;

        const elapsed = timestamp - this.startTime;
        const progress = Math.min(1, elapsed / this.duration);

        if (this.onFrame) {
            this.onFrame(progress);
        }

        if (progress < 1) {
            this.animationFrame = requestAnimationFrame(this.animate);
        } else {
            this.stop();
        }
    }

    cleanup() {
        this.stop();
        this.onFrame = null;
    }
}

export default AnimationController; 