import CodeMirror from 'codemirror';

export default function(config) {
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

            return jsMode.token(stream, state);
        }
    };
}
