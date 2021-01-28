const style = `
:host {
    position: absolute;
    margin: 35px 40px;
    width: 100%;
    max-width: 300px;
    z-index: 1;
    transition: opacity .15s var(--appearance-delay, 0ms);
    pointer-events: none;
}
:host(.init) {
    opacity: 0;
}
.progress {
    content: '';
    display: block;
    position: relative;
    overflow: hidden;
    margin-top: 4px;
    box-sizing: border-box;
    height: 3px;
    background: rgba(198, 198, 198, 0.3);
    border-radius: 2px;
}
.progress::before {
    content: '';
    display: block;
    height: 100%;
    width: 100%;
    position: absolute;
    left: 0;
    top: 0;
    transform: scaleX(var(--progress, 0));
    transform-origin: left;
    /* transition: transform .2s; */ /* since Chrome (tested on 85) freezes transition during js loop */
    background-color: #1f7ec5;
}`;

export const loadStages = {
    request: {
        value: 0.0,
        title: 'Awaiting data'
    },
    receive: {
        value: 0.1,
        title: 'Receiving data'
    },
    parse: {
        value: 0.9,
        title: 'Processing data (parse)'
    },
    prepare: {
        value: 0.925,
        title: 'Processing data (prepare)'
    },
    initui: {
        value: 0.975,
        title: 'Preparing UI'
    },
    done: {
        value: 1.0,
        title: 'Done!'
    }
};
Object.values(loadStages).forEach((item, idx, array) => {
    item.duration = (idx !== array.length - 1 ? array[idx + 1].value : 0) - item.value;
});

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
    constructor({ onTiming, delay }) {
        this.finished = false;
        this.awaitRepaint = null;
        this.lastStage = null;
        this.lastStageStart = null;
        this.timings = [];
        this.onTiming = typeof onTiming === 'function' ? onTiming : () => {};

        this.el = document.createElement('div');
        this.shadowRoot = this.el.attachShadow({ mode: 'closed' });

        this.el.className = 'progressbar init';
        this.el.style.setProperty('--appearance-delay', `${delay === true ? 200 : Number(delay) || 0}ms`);
        this.shadowRoot.innerHTML =
            `<style>${style}</style>` +
            '<div class="title"></div>' +
            '<div class="progress"></div>';
    }

    async setState(state) {
        const { stage, progress, error } = state;

        if (error || this.finished) {
            return;
        }


        const { value, title, duration } = loadStages[stage];
        const stageChanged = stage !== this.lastStage;
        const now = Date.now();
        let progressValue = 0;
        let progressLabel;

        if (!this.lastStage) {
            this.startTime = now;
            requestAnimationFrame(() => this.el.classList.remove('init'));
        }

        if (stageChanged) {
            if (this.lastStageStart !== null) {
                const entry = {
                    stage: this.lastStage,
                    title: loadStages[this.lastStage].title,
                    duration: now - this.lastStageStart
                };

                this.timings.push(entry);
                this.onTiming(entry);
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
        this.shadowRoot.querySelector('.title').textContent = progressLabel
            ? `${title} (${progressLabel})...`
            : stage !== 'done'
                ? `${title}...`
                : title;

        if (stageChanged || (now - this.awaitRepaint > 65 && now - this.lastStageStart > 200)) {
            await letRepaintIfNeeded();
            this.awaitRepaint = Date.now();
        }
    }

    finish() {
        if (!this.finished && this.lastStageStart !== null) {
            const stage = this.lastStage;
            const duration = Date.now() - this.lastStageStart;
            const title = loadStages[stage].title;
            const entry = { stage, title, duration };

            this.timings.push(entry);
            this.onTiming(entry);

            this.onTiming({
                stage: 'done',
                title: loadStages.done.title,
                duration: Date.now() - this.startTime
            });
        }

        this.finished = true;
    }

    dispose() {
        this.finish();
        this.el.remove();
    }
}
