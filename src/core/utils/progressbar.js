import { Observer } from '../observer.js';
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
    },
    error: {
        value: 1.0,
        title: 'Error!'
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

export function decodeStageProgress(stage, progress) {
    const { value, title: stageTitle, duration } = loadStages[stage];
    let progressValue = 0;
    let progressText = null;

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
            progressText = units === 'bytes'
                ? Math.round(progressValue * 100) + '%'
                : `${completed}/${total}`;
        } else {
            progressValue = done ? 1.0 : 0.1 + Math.min(0.9, elapsed / 20000);
            progressText = units === 'bytes'
                ? (completed / (1024 * 1024)).toFixed(1) + 'MB'
                : completed;
        }
    }

    return {
        stageTitle,
        progressValue: value + progressValue * duration,
        progressText,
        title: progressText
            ? `${stageTitle} (${progressText})...`
            : stage !== 'done'
                ? `${stageTitle}...`
                : stageTitle
    };
}

export default class Progressbar extends Observer {
    constructor({ onTiming, onFinish, delay, domReady }) {
        super({ stage: null, progress: null, error: null });
        this.finished = false;
        this.awaitRepaint = null;
        this.lastStage = 'created';
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

        if (this.finished) {
            return;
        }

        if (error) {
            this.set(
                'stage' in state
                    ? { stage, progress, error }
                    : { ...this.value, error }
            );
            this.finish(error);
            return;
        }

        this.set(state);

        const stageChanged = stage !== this.lastStage;
        const now = performance.now();

        if (this.lastStage === 'created') {
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

        const { title, progressValue } = decodeStageProgress(stage, progress);

        this.el.querySelector('.title').textContent = title;
        this.el.style.setProperty('--progress', progressValue);

        if (stageChanged || (now - this.awaitRepaint > 65 && now - this.lastStageStart > 200)) {
            await letRepaintIfNeeded();
            this.awaitRepaint = performance.now();
        }
    }

    finish(error) {
        if (!this.finished) {
            this.finished = true;

            if (this.lastStageStart !== null) {
                this.recordTiming(
                    this.lastStage,
                    this.lastStageStart
                );
            }

            this.recordTiming(error ? 'error' : 'done', this.startTime);
            this.onFinish(this.timings);
            this.set({ stage: 'done' });
        }
    }

    dispose() {
        this.finish();
        this.el.remove();
    }
}
