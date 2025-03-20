import usage from './switch.usage.js';

export default function(host) {
    host.textView.define('switch', function(node, config, data, context) {
        let { content } = config;
        let renderConfig = 'text:"<switch: no case choosen>"';

        if (Array.isArray(content)) {
            for (const branch of content) {
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

        return host.textView.render(node, renderConfig, data, context);
    }, { usage });
}
