class Animation {
    constructor(options) {
        this.duration = options.duration || 1000;
        this.startTime = performance.now();
        this.onUpdate = options.onUpdate;
        this.onComplete = options.onComplete;
        this.easing = options.easing || (t => t); // Linear easing by default
        this.isComplete = false;
        this.properties = options.properties || {};
    }

    update() {
        if (this.isComplete) return true;

        const currentTime = performance.now();
        const elapsed = currentTime - this.startTime;
        const progress = Math.min(1, elapsed / this.duration);
        const easedProgress = this.easing(progress);

        if (this.onUpdate) {
            this.onUpdate(easedProgress, this.properties);
        }

        if (progress >= 1) {
            this.isComplete = true;
            if (this.onComplete) {
                this.onComplete(this.properties);
            }
            return true;
        }

        return false;
    }
}

class AnimationController {
    constructor() {
        this.animations = new Map();
        this.speedMultiplier = 1.0;
        this.isRunning = false;
        this.animationFrame = null;
    }

    updateSpeed(volatility) {
        // Adjust animation speed based on market volatility
        this.speedMultiplier = Math.max(0.5, Math.min(2.0, volatility));
        this.updateAllAnimations();
    }

    addSpreadAnimation(center, marketCap) {
        const animation = new Animation({
            duration: 1000 / this.speedMultiplier,
            properties: {
                center,
                marketCap,
                radius: {
                    start: 0,
                    end: this.calculateRadius(marketCap)
                },
                intensity: {
                    start: 0.3,
                    end: this.calculateIntensity(marketCap)
                }
            },
            onUpdate: (progress, props) => {
                const currentRadius = this.lerp(props.radius.start, props.radius.end, progress);
                const currentIntensity = this.lerp(props.intensity.start, props.intensity.end, progress);
                
                if (props.center.onUpdate) {
                    props.center.onUpdate({
                        radius: currentRadius,
                        intensity: currentIntensity
                    });
                }
            },
            onComplete: (props) => {
                if (props.center.onComplete) {
                    props.center.onComplete();
                }
            },
            easing: this.easeOutCubic
        });

        const id = `spread-${Date.now()}-${Math.random()}`;
        this.animations.set(id, animation);
        
        if (!this.isRunning) {
            this.start();
        }

        return id;
    }

    addRouteAnimation(route, volatility) {
        const animation = new Animation({
            duration: 2000 / this.speedMultiplier,
            properties: {
                route,
                volatility,
                progress: {
                    start: 0,
                    end: 1
                }
            },
            onUpdate: (progress, props) => {
                if (props.route.onUpdate) {
                    props.route.onUpdate({
                        progress,
                        volatility: props.volatility
                    });
                }
            },
            onComplete: (props) => {
                if (props.route.onComplete) {
                    props.route.onComplete();
                }
            },
            easing: this.easeInOutQuad
        });

        const id = `route-${Date.now()}-${Math.random()}`;
        this.animations.set(id, animation);
        
        if (!this.isRunning) {
            this.start();
        }

        return id;
    }

    removeAnimation(id) {
        this.animations.delete(id);
        
        if (this.animations.size === 0) {
            this.stop();
        }
    }

    update() {
        for (const [id, animation] of this.animations.entries()) {
            if (animation.update()) {
                this.animations.delete(id);
            }
        }

        if (this.animations.size === 0) {
            this.stop();
        }
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.animate();
        }
    }

    stop() {
        this.isRunning = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    animate() {
        this.update();
        
        if (this.isRunning) {
            this.animationFrame = requestAnimationFrame(() => this.animate());
        }
    }

    updateAllAnimations() {
        for (const animation of this.animations.values()) {
            animation.duration = animation.duration * (1 / this.speedMultiplier);
        }
    }

    // Utility functions
    lerp(start, end, t) {
        return start + (end - start) * t;
    }

    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    calculateRadius(marketCap) {
        return Math.max(30, Math.min(200, marketCap / 1000000 * 50));
    }

    calculateIntensity(marketCap) {
        return Math.max(0.3, Math.min(1.0, marketCap / 10000000));
    }
}

module.exports = {
    AnimationController,
    Animation
}; 