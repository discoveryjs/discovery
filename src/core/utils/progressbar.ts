import type { LoadDataStateProgress } from './load-data.types.js';
import { Observer } from '../observer.js';
import { createElement } from './dom.js';

export type ProgressbarStage = keyof typeof loadStages;
export type ProgressbarTiming = {
    stage: ProgressbarStage;
    title: string;
    duration: number;
};
export type ProgressbarOnTimingCallback = (timing: ProgressbarTiming) => void;
export type ProgressbarOnFinishCallback = (timings: ProgressbarTiming[] & { awaitRepaintPenaltyTime: number }) => void;
export type ProgressbarOptions = Partial<{
    onTiming: ProgressbarOnTimingCallback;
    onFinish: ProgressbarOnFinishCallback;
    domReady: Promise<any>;
}>;
export type ProgressbarState = {
    stage: ProgressbarStage;
    progress: LoadDataStateProgress | null;
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
    receiving: {
        value: 0.1,
        duration: 0.8,
        title: 'Receiving data'
    },
    decoding: {
        value: 0.9,
        duration: 0.015,
        title: 'Decoding data'
    },
    received: {
        value: 0.915,
        duration: 0.01,
        title: 'Await app ready'
    },
    prepare: {
        value: 0.925,
        duration: 0.055,
        title: 'Processing data (prepare)'
    },
    initui: {
        value: 0.98,
        duration: 0.02,
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

const int = (value: number) => value | 0;
const ensureFunction = (value: any): (() => void) => typeof value === 'function' ? value : () => undefined;
const waitMs = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const letRepaintIfNeeded = async () => {
    if (!document.hidden) {
        return Promise.race([
            new Promise(requestAnimationFrame).then(() => waitMs(0)),
            waitMs(12)
        ]);
    }
};

export function decodeStageProgress(stage: ProgressbarStage, progress: ProgressbarState['progress'], step?: string) {
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
        stepText: step || '',
        title: progressText
            ? `${stageTitle} (${progressText})${step ? ':' : '...'}`
            : stage !== 'done'
                ? `${stageTitle}${step ? ':' : '...'}`
                : stageTitle
    };
}

export class Progressbar extends Observer<ProgressbarState> {
    startTime: number | null;
    lastStageStartTime: number | null;
    awaitRepaintPenaltyTime: number;
    finished: boolean;
    awaitRepaint: number | null;
    timings: ProgressbarTiming[];
    onTiming: ProgressbarOnTimingCallback;
    onFinish: ProgressbarOnFinishCallback;
    appearanceDelay: number;
    domReady: Promise<any>;
    el: HTMLElement;
    #titleEl: HTMLElement;
    #stepEl: HTMLElement;

    constructor({ onTiming, onFinish, domReady }: ProgressbarOptions) {
        super({ stage: 'inited', progress: null, error: null });

        this.startTime = null;
        this.lastStageStartTime = null;
        this.awaitRepaintPenaltyTime = 0;
        this.finished = false;
        this.awaitRepaint = null;
        this.timings = [];
        this.onTiming = ensureFunction(onTiming);
        this.onFinish = ensureFunction(onFinish);
        this.domReady = domReady || Promise.resolve();

        this.el = createElement('div', 'view-progress skip-fast-track', [
            createElement('div', 'content main-secondary', [
                this.#titleEl = createElement('span', 'main'),
                this.#stepEl = createElement('span', 'secondary')
            ]),
            createElement('div', 'progress')
        ]);
    }

    recordTiming(stage: ProgressbarStage, start: number, end = performance.now()) {
        const entry: ProgressbarTiming = {
            stage,
            title: loadStages[stage].title,
            duration: int(end - start)
        };

        // performance.measure(entry.title, {
        //     start,
        //     duration: entry.duration
        // });

        this.lastStageStartTime = end;
        this.timings.push(entry);
        this.onTiming(entry);
    }

    async #awaitRenderIfNeeded(enforce = false, now = performance.now()) {
        const timeSinceAwaitRepaint = now - (this.awaitRepaint || 0);
        const timeSinceLastStageStart = now - (this.lastStageStartTime || 0);

        if (enforce || (timeSinceAwaitRepaint > 65 && timeSinceLastStageStart > 200)) {
            const startAwaitRepaint = performance.now();

            await letRepaintIfNeeded();

            this.awaitRepaintPenaltyTime += performance.now() - startAwaitRepaint;
            this.awaitRepaint = performance.now();
        }
    }

    async setState(state: Partial<ProgressbarState>, step?: string) {
        const currentStage = this.value.stage;
        const { stage = currentStage, progress = null, error = null } = state;

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

        const stageChanged = stage !== currentStage;
        const now = performance.now();

        if (currentStage === 'inited') {
            this.startTime = now;
        }

        if (stageChanged) {
            if (this.lastStageStartTime !== null) {
                this.recordTiming(currentStage, this.lastStageStartTime, now);
            }

            this.lastStageStartTime = now;
            this.awaitRepaint = now;
        }

        const { title, stepText, progressValue } = decodeStageProgress(stage, progress, step);

        this.el.style.setProperty('--progress', String(progressValue));
        this.#titleEl.textContent = title;
        this.#stepEl.textContent = stepText;
        this.el.offsetWidth; // should trigger reflow, which in turn should trigger repaint

        await this.#awaitRenderIfNeeded(stageChanged, now);
    }

    async setStateStep(step: string) {
        const { title, stepText } = decodeStageProgress(this.value.stage, this.value.progress, step);

        this.#titleEl.textContent = title;
        this.#stepEl.textContent = stepText;
        this.el.offsetWidth; // should trigger reflow, which in turn should trigger repaint

        await this.#awaitRenderIfNeeded(true);
    }

    finish(error?: Error) {
        if (!this.finished) {
            this.finished = true;

            if (this.lastStageStartTime !== null) {
                this.recordTiming(
                    this.value.stage,
                    this.lastStageStartTime
                );
            }

            this.recordTiming(error ? 'error' : 'done', this.startTime || this.lastStageStartTime || performance.now());
            this.set({ stage: 'done', progress: null, error: error || null });
            this.onFinish(Object.assign([...this.timings], {
                awaitRepaintPenaltyTime: Math.round(this.awaitRepaintPenaltyTime)
            }));

            this.el.classList.add('done');
            this.el.classList.toggle('error', Boolean(error));
        }
    }

    dispose() {
        this.finish();
        this.el.remove();
    }
}
