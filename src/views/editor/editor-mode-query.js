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
                if (state.isAssertionContext) {
                    if ((token === 'variable' || token === 'atom') && (state.isAssertionParen === 0 && str !== 'not')) {
                        return 'type';
                    }

                    if (str === '(') {
                        state.isAssertionParen++;
                    } else if (str === ')') {
                        if (state.isAssertionParen > 0) {
                            state.isAssertionParen--;
                        }
                        if (state.isAssertionParen === 0) {
                            state.isAssertionContext = false;
                        }
                    }
                }

                if (keywords.has(str)) {
                    if (str === 'is') {
                        state.isAssertionContext = true;
                        state.isAssertionParen = 0;
                    }

                    return 'keyword';
                }
            }

            if (state.isAssertionContext) {
                if (token === 'variable' || token === 'atom') {
                    return 'type';
                }

                if (state.isAssertionParen === 0 && (token || /\S/.test(str))) {
                    state.isAssertionContext = false;
                }
            }

            return token;
        }
    };
}
