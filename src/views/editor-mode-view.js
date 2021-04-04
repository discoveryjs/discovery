import CodeMirror from 'codemirror';

export default function(config, options) {
    const isDiscoveryViewDefined = typeof options.isDiscoveryViewDefined === 'function'
        ? options.isDiscoveryViewDefined
        : () => {};
    const jsMode = CodeMirror.getMode(config, {
        name: 'javascript',
        json: true
    });

    return {
        ...jsMode,
        indent(state, textAfter) {
            return state.indented + config.indentUnit * (
                (state.lastType === '{' && textAfter.trim()[0] !== '}') ||
                (state.lastType === '(' && textAfter.trim()[0] !== ')') ||
                (state.lastType === '[' && textAfter.trim()[0] !== ']')
            );
        },
        token: function(stream, state) {
            if (state.suspendTokens) {
                const { pos, token } = state.suspendTokens.shift();

                stream.pos = pos;
                if (state.suspendTokens.length === 0) {
                    state.suspendTokens = null;
                }

                return token;
            }

            const start = stream.pos;
            const token = jsMode.token(stream, state);

            if (token === 'string') {
                const end = stream.pos;
                const [, viewName] = stream.string
                    .slice(start + 1, end - 1)
                    .match(/^(.+?)([:{]|$)/) || [];

                if (isDiscoveryViewDefined(viewName)) {
                    stream.pos = start + 1;
                    state.suspendTokens = [
                        { pos: start + 1 + viewName.length, token: 'string discovery-view-name' },
                        { pos: end, token }
                    ];
                }
            }

            return token;
        }
    };
};
