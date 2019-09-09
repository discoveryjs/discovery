/* eslint-env browser */

import Highcharts from '/gen/highcharts.js';

export default function(discovery) {
    discovery.view.define('chart', function(el, config, data, context) {
        const { options } = config;
        const label = '<b>{point.y}</b> ({point.percentage:.1f}%)';

        if (!Array.isArray(data)) {
            data = data ? [data] : [];
        }

        if (data[0] && !data[0].data) {
            data = [{ data }];
        }

        try {
            Highcharts.chart(el, Highcharts.merge({
                chart: {
                    type: 'pie',
                    height: '60%'
                },
                title: {
                    text: undefined
                },
                credits: {
                    enabled: false
                },
                tooltip: {
                    pointFormat: label
                },
                plotOptions: {
                    pie: {
                        cursor: 'pointer',
                        dataLabels: {
                            format: '{point.name} – ' + label,
                            useHTMsL: true
                        }
                    }
                },
                series: data
            }, options));
        } catch (e) {
            discovery.view.render(el, { view: 'fallback', reason: e.message }, data, context);
        }
    });
}
