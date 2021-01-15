import { loadStages } from './load-data.js';
const style = `
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

export default function progressbar(state) {
    const wrapperEl = document.createElement('div');
    const shadow = wrapperEl.attachShadow({ mode: 'open' });

    wrapperEl.className = 'progressbar';
    shadow.innerHTML =
        `<style>${style}</style>` +
        '<div>' +
        '<div class="title"></div>' +
        '<div class="progress"></div>' +
        '</div>';

    // const processEl =
    const unsubscribe = state.subscribeSync(state => {
        const { stage, progress, error } = state;

        if (error) {
            unsubscribe();
            return;
        }

        const { value, title, duration } = loadStages[stage];
        let progressValue = 0;
        let progressLabel;

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

        wrapperEl.style.setProperty('--progress', value + progressValue * duration);
        shadow.querySelector('.title').textContent = progressLabel
            ? `${title} (${progressLabel})...`
            : stage !== 'done'
                ? `${title}...`
                : title;

        if (stage === 'done') {
            unsubscribe();
        }
    });

    return {
        el: wrapperEl,
        unsubscribe,
        dispose() {
            unsubscribe();
            wrapperEl.remove();
        }
    };
}
