/* eslint-env browser */
import usage from './switch.usage.js';

export default function(host) {
    host.view.define('switch', function(el, config, data, context) {
        let { content } = config;
        let renderConfig = 'alert-warning:"No case choosen"';

        if (Array.isArray(content)) {
            for (let i = 0; i < content.length; i++) {
                const branch = content[i];

                if (branch && host.queryBool(branch.when || true, data, context)) {
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

        return host.view.render(el, renderConfig, data, context);
    }, {
        tag: false,
        usage
    });
}
