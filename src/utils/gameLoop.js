
export default class GameLoop {
    constructor(updateCallback) {
        this.updateCallback = updateCallback;
        this.lastTime = 0;
        this.running = false;
        this.animationFrameId = null;
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.lastTime = performance.now();
        this.loop(this.lastTime);
    }

    stop() {
        this.running = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }

    loop(currentTime) {
        if (!this.running) return;

        const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
        this.lastTime = currentTime;

        this.updateCallback(deltaTime);

        this.animationFrameId = requestAnimationFrame((time) => this.loop(time));
    }
}
