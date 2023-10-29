import CodeMirror from 'codemirror';

export default function(config) {
    const keywords = new Set([
        'has', 'in', 'no', 'not', 'and', 'or', 'is',
        'asc', 'ascN', 'ascA', 'ascAN', 'ascNA',
        'desc', 'descN', 'descA', 'descAN', 'descNA'
    ]);
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
        token(stream, state) {
            const next = stream.peek();

            if (next === '#' || next === '@') {
                jsMode.token(new CodeMirror.StringStream('$', 4, stream.lineOracle), state);
                stream.pos++;
                return 'variable';
            }

            let token = jsMode.token(stream, state);
            const str = stream.string.slice(stream.start, stream.pos);

            if (stream.string[stream.start - 1] !== '.') {
                if (state.isContext) {
                    if (token === 'variable' && (state.isContextParen === 0 && str !== 'not')) {
                        return 'type';
                    }

                    if (str === '(') {
                        state.isContextParen++;
                    } else if (str === ')') {
                        if (state.isContextParen > 0) {
                            state.isContextParen--;
                        }
                        if (state.isContextParen === 0) {
                            state.isContext = false;
                        }
                    }
                }

                if (keywords.has(str)) {
                    if (str === 'is') {
                        state.isContext = true;
                        state.isContextParen = 0;
                    }

                    return 'keyword';
                }
            }

            if (state.isContext) {
                if (token === 'variable') {
                    return 'type';
                }

                if (state.isContextParen === 0 && (token || /\S/.test(str))) {
                    state.isContext = false;
                }
            }

            return token;
        }
    };
}
