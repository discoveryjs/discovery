import usage from './text-render.usage.js';

export default function(host) {
    host.view.define('text-render', async function(el, config, data, context) {
        const { content } = config;
        const textRenderTree = await host.textView.render(null, content, data, context);

        el.append(host.textView.serialize(textRenderTree));
    }, { tag: 'pre', usage });
};
