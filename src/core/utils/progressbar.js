import { createElement } from './dom.js';

export const loadStages = {
    request: {
        value: 0.0,
        title: 'Awaiting data'
    },
    receive: {
        value: 0.1,
        title: 'Receiving data'
    },
    received: {
        value: 0.9,
        title: 'Await app ready'
    },
    prepare: {
        value: 0.925,
        title: 'Processing data (prepare)'
    },
    initui: {
        value: 0.975,
        title: 'Rendering UI'
    },
    done: {
        value: 1.0,
        title: 'Done!'
    }
};
Object.values(loadStages).forEach((item, idx, array) => {
    item.duration = (idx !== array.length - 1 ? array[idx + 1].value : 0) - item.value;
});

const int = value => value | 0;
const ensureFunction = value => typeof value === 'function' ? value : () => {};
const letRepaintIfNeeded = async () => {
    await new Promise(resolve => setTimeout(resolve, 1));

    if (!document.hidden) {
        return Promise.race([
            new Promise(requestAnimationFrame),
            new Promise(resolve => setTimeout(resolve, 8))
        ]);
    }
};

export default class Progressbar {
    constructor({ onTiming, onFinish, delay, domReady }) {
        this.finished = false;
        this.awaitRepaint = null;
        this.lastStage = null;
        this.lastStageStart = null;
        this.timings = [];
        this.onTiming = ensureFunction(onTiming);
        this.onFinish = ensureFunction(onFinish);
        this.appearanceDelay = delay === true ? 200 : Number(delay) || 0;
        this.domReady = domReady || Promise.resolve();

        this.el = createElement('div', 'view-progress init', [
            createElement('div', 'title'),
            createElement('div', 'progress')
        ]);
    }

    recordTiming(stage, start, end = performance.now()) {
        const entry = {
            stage,
            title: loadStages[stage].title,
            duration: int(end - start)
        };

        // performance.measure(entry.title, {
        //     start,
        //     duration: entry.duration
        // });

        this.timings.push(entry);
        this.onTiming(entry);
    }

    async setState(state) {
        const { stage, progress, error } = state;

        if (error || this.finished) {
            return;
        }

        const { value, title, duration } = loadStages[stage];
        const stageChanged = stage !== this.lastStage;
        const now = performance.now();
        let progressValue = 0;
        let progressLabel;

        if (!this.lastStage) {
            this.startTime = now;
            this.domReady.then(() => {
                const appearanceDelay = Math.max(0, this.appearanceDelay - int(performance.now() - now));

                if (appearanceDelay) {
                    this.el.style.setProperty('--appearance-delay', `${appearanceDelay}ms`);
                }

                // This is a hack to trigger styles computation,
                // otherwise Blink might not run a transition for progressbar appearance
                // and it will be shown immediately which is not desired in case of fast loaded data
                getComputedStyle(this.el).opacity;

                this.el.classList.remove('init');
            });
        }

        if (stageChanged) {
            if (this.lastStageStart !== null) {
                this.recordTiming(this.lastStage, this.lastStageStart, now);
            }

            this.lastStage = stage;
            this.lastStageStart = now;
            this.awaitRepaint = now;
        }

        if (progress) {
            const {
                done,
                elapsed,
                units,
                completed,
                total
            } = progress;

            if (total) {
                progressValue = done ? 1.0 : completed / total;
                progressLabel = units === 'bytes'
                    ? Math.round(progressValue * 100) + '%'
                    : `${completed}/${total}`;
            } else {
                progressValue = done ? 1.0 : 0.1 + Math.min(0.9, elapsed / 20000);
                progressLabel = units === 'bytes'
                    ? (completed / (1024 * 1024)).toFixed(1) + 'MB'
                    : completed;
            }
        }

        this.el.style.setProperty('--progress', value + progressValue * duration);
        this.el.querySelector('.title').textContent = progressLabel
            ? `${title} (${progressLabel})...`
            : stage !== 'done'
                ? `${title}...`
                : title;

        if (stageChanged || (now - this.awaitRepaint > 65 && now - this.lastStageStart > 200)) {
            await letRepaintIfNeeded();
            this.awaitRepaint = performance.now();
        }
    }

    finish() {
        if (!this.finished) {
            this.finished = true;

            if (this.lastStageStart !== null) {
                this.recordTiming(
                    this.lastStage,
                    this.lastStageStart
                );
            }

            this.recordTiming('done', this.startTime);
            this.onFinish(this.timings);
        }
    }

    dispose() {
        this.finish();
        this.el.remove();
    }
}
