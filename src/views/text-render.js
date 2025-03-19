import usage from './text-render.usage.js';

export default function(host) {
    host.view.define('text-render', async function(el, config, data, context) {
        const { content } = config;
        const textRenderTree = await host.textView.render('block', content, data, context);

        el.append(host.textView.serialize(textRenderTree).text);
    }, { tag: 'pre', usage });

    host.view.define('text-render-tree', async function(el, config, data, context) {
        const { content, expanded = 2 } = config;
        const textRenderTree = await host.textView.render('block', content, data, context);

        return this.render(el, { view: 'struct', expanded }, host.textView.cleanUpRenderTree(textRenderTree));
    }, { tag: false });
};
