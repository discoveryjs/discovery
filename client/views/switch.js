/* eslint-env browser */

export default function(discovery) {
    discovery.view.define('switch', function(el, config, data, context) {
        let { content } = config;
        let renderConfig = 'alert-warning:"No case choosen"';

        if (Array.isArray(content)) {
            for (let i = 0; i < content.length; i++) {
                const branch = content[i];

                if (branch && discovery.queryBool(branch.when || true, data, context)) {
                    renderConfig = 'data' in branch
                        ? {
                            view: 'context',
                            data: branch.data,
                            content: branch.content
                        }
                        : branch.content;
                    break;
                }
            }
        }

        discovery.view.render(el, renderConfig, data, context);
    }, {
        tag: false
    });
}
