import { Observer } from '../observer.js';
import { createElement } from './dom.js';

export type Stage = keyof typeof loadStages;
export type Timing = {
    stage: Stage;
    title: string;
    duration: number;
};
export type OnTimingCallback = (timing: Timing) => void;
export type OnFinishCallback = (timings: Timing[]) => void;
export type ProgressbarOptions = Partial<{
    onTiming: OnTimingCallback;
    onFinish: OnFinishCallback;
    delay: number | true;
    domReady: Promise<any>;
}>;
export type ProgressbarState = {
    stage: Stage;
    progress: {
        done: boolean;
        elapsed: number;
        units?: 'bytes';
        completed: number;
        total?: number;
    } | null;
    error: Error | null;
};

export const loadStages = {
    inited: {
        value: 0,
        duration: 0,
        title: 'Init'
    },
    request: {
        value: 0,
        duration: 0.1,
        title: 'Awaiting data'
    },
    receive: {
        value: 0.1,
        duration: 0.8,
        title: 'Receiving data'
    },
    received: {
        value: 0.9,
        duration: 0.025,
        title: 'Await app ready'
    },
    prepare: {
        value: 0.925,
        duration: 0.050,
        title: 'Processing data (prepare)'
    },
    initui: {
        value: 0.975,
        duration: 0.025,
        title: 'Rendering UI'
    },
    done: {
        value: 1.0,
        duration: 0,
        title: 'Done!'
    },
    error: {
        value: 1.0,
        duration: 0,
        title: 'Error'
    }
};
Object.values(loadStages).forEach((item, idx, array) => {
    item.duration = (idx !== array.length - 1 ? array[idx + 1].value : 0) - item.value;
});

const int = (value: number) => value | 0;
const ensureFunction = (value: any): (() => void) => typeof value === 'function' ? value : () => undefined;
const letRepaintIfNeeded = async () => {
    await new Promise(resolve => setTimeout(resolve, 1));

    if (!document.hidden) {
        return Promise.race([
            new Promise(requestAnimationFrame),
            new Promise(resolve => setTimeout(resolve, 8))
        ]);
    }
};

export function decodeStageProgress(stage: Stage, progress: ProgressbarState['progress']) {
    const { value, title: stageTitle, duration } = loadStages[stage];
    let progressValue = 0;
    let progressText: string | null = null;

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
                : String(completed);
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

export default class Progressbar extends Observer<ProgressbarState> {
    startTime: number | null;
    finished: boolean;
    awaitRepaint: number | null;
    lastStage: Stage;
    lastStageStart: number | null;
    timings: Timing[];
    onTiming: OnTimingCallback;
    onFinish: OnFinishCallback;
    appearanceDelay: number;
    domReady: Promise<any>;
    el: HTMLElement;

    constructor({ onTiming, onFinish, delay, domReady }: ProgressbarOptions) {
        super({ stage: 'inited', progress: null, error: null });
        this.startTime = null;
        this.finished = false;
        this.awaitRepaint = null;
        this.lastStage = 'inited';
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

    recordTiming(stage: Stage, start: number, end = performance.now()) {
        const entry: Timing = {
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

    async setState(state: Partial<ProgressbarState>) {
        const { stage = this.lastStage, progress = null, error = null } = state;

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

        this.set({ stage, progress, error });

        const stageChanged = stage !== this.lastStage;
        const now = performance.now();

        if (this.lastStage === 'inited') {
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
        const titleEl = this.el.querySelector('.title');

        this.el.style.setProperty('--progress', String(progressValue));

        if (titleEl !== null) {
            titleEl.textContent = title;
        }

        if (stageChanged || (now - (this.awaitRepaint || 0) > 65 && now - (this.lastStageStart || 0) > 200)) {
            await letRepaintIfNeeded();
            this.awaitRepaint = performance.now();
        }
    }

    finish(error?: Error) {
        if (!this.finished) {
            this.finished = true;

            if (this.lastStageStart !== null) {
                this.recordTiming(
                    this.lastStage,
                    this.lastStageStart
                );
            }

            this.recordTiming(error ? 'error' : 'done', this.startTime || this.lastStageStart || performance.now());
            this.onFinish(this.timings);
            this.set({ stage: 'done', progress: null, error: null });
        }
    }

    dispose() {
        this.finish();
        this.el.remove();
    }
}
