function prettySize(size, signed, pad) {
    const unit = ['', 'kB', 'MB', 'GB'];

    while (Math.abs(size) > 1000) {
        size /= 1000;
        unit.shift();
    }

    return (
        (signed && size > 0 ? '+' : '') +
        size.toFixed(unit.length > 2 ? 0 : 1) +
        unit[0]
    ).padStart(pad || 0);
}

function prettyTime(time) {
    return (time / 1000).toFixed(2) + 's';
}

function prettyThroughput(size, time) {
    return prettySize(parseInt(1000 * size / time)) + '/s';
}

function isSameOrigin(url) {
    try {
        return new URL(url, location.origin).origin === location.origin;
    } catch (e) {
        return false;
    }
}

async function fetchUrl(url, progressEl, parse) {
    const startTime = Date.now();

    progressEl.innerHTML = '<div class="title">Awaiting response</div><div class="progress"></div>';

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(await response.text());
        }

        let data;
        let size = Number(isSameOrigin(url) && !response.headers.get('content-encoding')
            ? response.headers.get('content-length')
            : response.headers.get('x-file-size')) || 0;

        if (parse) {
            progressEl.firstElementChild.textContent = 'Receive data';
            progressEl.style.setProperty('--progress', 1 / 3);
            const json = await response.text();

            if (!size) {
                size = json.length;
            }

            progressEl.firstElementChild.textContent = 'Parse data';
            progressEl.style.setProperty('--progress', 2 / 3);
            await new Promise(resolve => setTimeout(resolve, 20));
            data = JSON.parse(json);
        } else {
            progressEl.firstElementChild.textContent = 'Receive & parse data';
            progressEl.style.setProperty('--progress', 1.5 / 3);
            data = await response.json();
        }

        progressEl.firstElementChild.textContent = 'Done';
        progressEl.classList.add('done');
        progressEl.style.setProperty('--progress', 3 / 3);
        await new Promise(resolve => setTimeout(resolve, 20));

        return {
            data,
            size,
            loadTime: Date.now() - startTime
        };
    } catch (error) {
        progressEl.innerHTML = [
            '<div class="view-alert view-alert-danger">',
            '<h3 class="view-header">Ops, something went wrong with data loading</h3>',
            '<pre>' + String(error) + '</pre>',
            '</div>'
        ].join('');
    }
}

discovery.page.define('default', [
    'h1:#.name',
    {
        view: 'block',
        className: 'benchmarks',
        content: {
            view: 'context',
            modifiers: {
                view: 'block',
                className: 'setup',
                content: [
                    {
                        view: 'textarea',
                        name: 'urls',
                        value: '=#.params.urls'
                    },
                    {
                        view: 'toggle-group',
                        name: 'mode',
                        value: '=#.params.mode or "default"',
                        data: [
                            { value: 'default', text: 'loadDataFromUrl()' },
                            { value: 'fetch-parse', text: 'fetch.text() -> JSON.parse()' },
                            { value: 'fetch', text: 'fetch.json()' }
                        ]
                    }
                ]
            },
            content: [
                function(el, config, data, context) {
                    discovery.setPageParams({
                        urls: context.urls,
                        mode: context.mode
                    }, true);
                    discovery.cancelScheduledRender();
                },
                {
                    view: 'block',
                    className: 'results',
                    content: {
                        view: 'button',
                        data: { text: 'Bench!' },
                        async onClick(el, data, context) {
                            const urls = context.urls.split(/\n/).map(s => s.trim()).filter(Boolean);
                            const containerEl = document.querySelector('.results');
                            const results = [];
                            const startTime = Date.now();

                            containerEl.innerHTML = '<div class="freeze-detector"></div>';
                            const responsive = setInterval(() => containerEl.firstElementChild.textContent = Date.now() - startTime, 1000 / 60);

                            for (const url of urls) {
                                if (!document.body.contains(containerEl)) {
                                    // if container is not in document, then it was removed due to re-render
                                    // prevent request processing
                                    clearInterval(responsive);
                                    return;
                                }

                                const statEl = document.createElement('div');
                                statEl.className = 'stat';
                                statEl.innerHTML = [
                                    '<span class="url">' + discovery.lib.utils.escapeHtml(url) + '</span>',
                                    '<span class="metric throughput-rate"></span>',
                                    '<span class="metric load-time"></span>',
                                    '<span class="metric size"></span>'
                                ].join('');

                                const progressEl = document.createElement('div');
                                progressEl.className = 'progress-tracker';

                                containerEl.append(progressEl);

                                try {
                                    const result = context.mode !== 'default'
                                        ? fetchUrl(url, progressEl, context.mode === 'fetch-parse')
                                        : discovery.loadDataFromUrl.call({
                                            trackLoadDataProgress: discovery.trackLoadDataProgress,
                                            setData() {},
                                            options: {},
                                            dom: {
                                                loadingOverlay: progressEl
                                            }
                                        }, url);
                                    progressEl.append(statEl);
                                    const { size, loadTime } = await result;

                                    statEl.querySelector('.load-time').textContent = prettyTime(loadTime);
                                    progressEl.style.setProperty('--load-time', loadTime);
                                    if (size) {
                                        statEl.querySelector('.size').textContent = prettySize(size);
                                        progressEl.style.setProperty('--load-size', size);
                                        statEl.querySelector('.throughput-rate').textContent = prettyThroughput(size, loadTime);
                                        progressEl.style.setProperty('--throughput-rate', size);
                                    } else {
                                        statEl.querySelector('.size').remove();
                                        statEl.querySelector('.throughput-rate').remove();
                                    }

                                    results.push({
                                        url,
                                        size,
                                        loadTime
                                    });

                                    await new Promise(resolve => setTimeout(resolve, 350));
                                } catch (e) {
                                    progressEl.append(statEl);
                                }
                            }

                            clearInterval(responsive);

                            const totalStatEl = document.createElement('div');
                            const totalTime = results.reduce((sum, { loadTime }) => sum + loadTime, 0);
                            const totalSize = results.reduce((sum, { size }) => sum + size, 0);
                            const throughputTime = results
                                .filter(({ size }) => size)
                                .reduce((sum, { loadTime }) => sum + loadTime, 0);

                            totalStatEl.className = 'total-stat';
                            totalStatEl.innerHTML = [
                                '<span class="span"></span>',
                                '<span>',
                                ...throughputTime ? [
                                    'Avg throughput rate: ',
                                    '<span class="throughput-rate">' + prettyThroughput(totalSize, throughputTime) + '</span>'
                                ] : [],
                                'Score:',
                                '<span class="score">' + totalTime + '</span><br>',
                                '<span class="score-note">Lower is better (total ms)</span>',
                                '</span>'
                            ].join('');

                            totalStatEl.firstElementChild.append(el);
                            containerEl.append(totalStatEl);
                        }
                    }
                }
            ]
        }
    }
]);

discovery.view.define('textarea', function(el, config) {
    const { onInit, onChange, name, value } = config;
    const getValue = () => {
        localStorage.setItem('load-benchmark-urls', el.value);
        return el.value;
    };

    el.value = value || localStorage.getItem('load-benchmark-urls') || '';
    el.addEventListener('input', () => {
        if (typeof onChange === 'function') {
            onChange(getValue(), name);
        }
    });

    if (typeof onInit === 'function') {
        onInit(getValue(), name);
    }
}, { tag: 'textarea' });
