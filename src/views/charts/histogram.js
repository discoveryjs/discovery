/* eslint-env browser */
import usage from './histogram.usage.js';

const sizes = ['xs', 's', 'm', 'l', 'xl'];
const defaultBinSize = [16, 26, 51, 81, 101];
const binTooltip = [
    'text-numeric:`Range: [${min} .. ${max}) Δ ${binSize}`',
    'html:"<br>"',
    'text:`Count: ${count} (${percent}%)`'
];

export default function(host) {
    host.view.define('histogram', function(el, config, data) {
        data = config.dataset || data;

        if (!Array.isArray(data)) {
            data = [];
        }

        const numbers = data
            .map(element => typeof element === 'number' ? element : element?.x)
            .filter(element => Number.isFinite(element));

        if (!numbers.length) {
            el.textContent = 'No numbers';
            return;
        }

        let min = Number.isFinite(config.min) ? config.min : numbers[0];
        let max = Number.isFinite(config.max) ? config.max : numbers[0];

        for (let i = 1; i < numbers.length; i++) {
            const num = numbers[i];

            if (num < min) {
                min = num;
            }

            if (num > max) {
                max = num;
            }
        }

        const size = sizes.includes(config.size) ? config.size : 's';
        const range = max - min;
        const binMin = config.xlog ? Math.log1p(min) : min;
        const binMax = config.xlog ? Math.log1p(max) : max;
        const binRange = binMax - binMin;
        const binCount = Math.ceil(Math.min(
            binRange + 1,
            config.bins > 0 && Number.isFinite(config.bins) ? config.bins : defaultBinSize[sizes.indexOf(size)]
        ));

        const { avg, median } = host.query('{ avg(), median() }', numbers);
        const bins = new Uint32Array(binCount);
        const binSize = binCount > 0 ? (binRange + 1) / binCount : 1;

        for (let i = 0; i < numbers.length; i++) {
            const num = config.xlog ? Math.log1p(numbers[i] - min) : numbers[i] - min;
            bins[Math.floor(num / binSize)]++;
        }

        console.log(Math.floor((3 - min) / binSize), {min, binRange: binSize});
        console.log({ avg, median });

        const maxBinSize = Math.max(...bins);
        const canvasEl = el.appendChild(document.createElement('div'));
        const rangeEl = el.appendChild(document.createElement('div'));

        canvasEl.className = 'view-histogram__canvas';
        rangeEl.className = 'view-histogram__range';

        el.dataset.size = size;
        el.dataset.yScale = config.ylog ? 'log' : 'linear';
        el.style.setProperty('--max-bin-size', maxBinSize);
        el.style.setProperty('--max-bin-log-size', Math.log1p(maxBinSize));
        el.style.setProperty('--bin-count', bins.length);
        el.style.setProperty('--range', range);
        el.style.setProperty('--range-min', min);
        el.style.setProperty('--range-max', max);
        el.style.setProperty('--range-avg', avg);
        el.style.setProperty('--range-median', median);

        rangeEl.dataset.min = min;
        rangeEl.dataset.max = max;

        for (let i = 0; i < bins.length; i++) {
            const barEl = document.createElement('div');

            barEl.className = 'view-histogram__bar';
            barEl.style.setProperty('--bin-size', bins[i]);
            barEl.style.setProperty('--bin-log-size', Math.log1p(bins[i]));

            const rangeMin = min + (config.xlog ? Math.expm1(i * binSize) : i * binSize);
            const rangeMax = min + (config.xlog ? Math.expm1(i * binSize + binSize) : i * binSize + binSize);
            const fraction = (bins[i] / numbers.length);
            this.tooltip(barEl, config.binTooltip || binTooltip, {
                count: bins[i],
                total: numbers.length,
                fraction: fraction.toFixed(2).replace(/\.?0+$/, ''),
                percent: (100 * fraction).toFixed(2).replace(/\.?0+$/, ''),
                min: rangeMin.toFixed(4).replace(/\.?0+$/, ''),
                max: rangeMax.toFixed(4).replace(/\.?0+$/, ''),
                binSize: binSize.toFixed(4).replace(/\.?0+$/, '')
            });

            canvasEl.append(barEl);
        }

    }, { usage });
}
