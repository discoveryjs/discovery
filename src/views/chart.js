import billboard from '/gen/billboard.js';
import usage from './chart.usage.js';

export default function(discovery) {
    discovery.view.define('chart', function render(el, config, data, context) {
        const { bb } = billboard;
        const chart = bb.generate({
            bindto: el,
            data: {
                columns: [
                    ...Object.entries(data).map(([name, values]) => [name, ...values])
                ],
                type: 'line'
            }
        });

        setTimeout(() => {
            chart.resize();
        });
    }, { usage })
}
