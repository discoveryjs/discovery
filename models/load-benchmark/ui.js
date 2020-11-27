discovery.page.define('default', [
    'h1:#.name',
    {
        view: 'block',
        className: 'benchmarks',
        content: {
            view: 'context',
            modifiers: {
                view: 'textarea',
                name: 'urls'
            },
            content: {
                view: 'block',
                className: 'results',
                content: {
                    view: 'button',
                    data: { text: 'Bench!' },
                    async onClick(el, data, context) {
                        const urls = context.urls.split(/\n/).map(s => s.trim()).filter(Boolean);
                        const containerEl = el.parentNode;

                        containerEl.innerHTML = '';

                        for (const url of urls) {
                            if (!document.body.contains(containerEl)) {
                                // if container not in document, then it was removed due to re-render
                                // prevent continue requests
                                return;
                            }

                            const progressEl = document.createElement('div');
                            progressEl.className = 'progress-tracker';
                            progressEl.style.setProperty('--url', JSON.stringify(url));
                            containerEl.append(progressEl);

                            try {
                                await discovery.loadDataFromUrl.call({
                                    setData() {},
                                    trackLoadDataProgress: discovery.trackLoadDataProgress,
                                    dom: {
                                        loadingOverlay: progressEl
                                    }
                                }, url);
                                await new Promise(resolve => setTimeout(resolve, 250));
                            } catch (e) {}
                        }

                        containerEl.append(el);
                    }
                }
            }
        }
    }
]);

discovery.view.define('textarea', function(el, config) {
    const { onInit, onChange, name } = config;
    const getValue = () => {
        localStorage.setItem('load-benchmark-urls', el.value);
        return el.value;
    };

    el.value = localStorage.getItem('load-benchmark-urls') || '';
    el.addEventListener('input', () => {
        if (typeof onChange === 'function') {
            onChange(getValue(), name);
        }
    });

    if (typeof onInit === 'function') {
        onInit(getValue(), name);
    }
}, { tag: 'textarea' });
