/* eslint-env browser */

import { createElement } from '../core/utils/dom.js';
import { escapeHtml } from '../core/utils/html.js';
import Emitter from '../core/emitter.js';
import CodeMirror from 'codemirror';
import 'codemirror/mode/javascript/javascript';
import './editors-hint.js';

function renderQueryAutocompleteItem(el, self, { entry: { value, current, type }}) {
    const startChar = current[0];
    const lastChar = current[current.length - 1];
    const start = startChar === '"' || startChar === "'" ? 1 : 0;
    const end = lastChar === '"' || lastChar === "'" ? 1 : 0;
    const pattern = current.toLowerCase().substring(start, current.length - end);
    const offset = pattern ? value.toLowerCase().indexOf(pattern, value[0] === '"' || value[0] === "'" ? 1 : 0) : -1;

    if (offset !== -1) {
        value = (
            escapeHtml(value.substring(0, offset)) +
            '<span class="match">' + escapeHtml(value.substr(offset, pattern.length)) + '</span>' +
            escapeHtml(value.substr(offset + pattern.length))
        );
    }

    el.appendChild(createElement('span', 'name', value));
    el.appendChild(createElement('span', 'type', type));
}

class Editor extends Emitter {
    constructor({ hint, mode }) {
        super();

        this.el = document.createElement('div');
        this.el.className = 'discovery-editor';

        const self = this;
        const cm = CodeMirror(this.el, {
            extraKeys: { 'Alt-Space': 'autocomplete' },
            mode: mode || 'javascript',
            theme: 'neo',
            indentUnit: 0,
            showHintOptions: {
                hint,
                get darkmode() {
                    return self.darkmode.value ? 'darkmode' : false;
                }
            }
        });

        cm.on('change', () => this.emit('change', cm.getValue()));

        if (typeof hint === 'function') {
            // patch prepareSelection to inject a context hint
            // const ps = cm.display.input.prepareSelection;
            // cm.display.input.prepareSelection = function(...args) {
            //     const selection = ps.apply(this, args);
            //     if (selection.cursors.firstChild) {
            //         selection.cursors.firstChild.appendChild(createElement('div', 'context-hint', 'asd'));
            //     }
            //     return selection;
            // };

            cm.on('cursorActivity', cm => {
                cm.state.focused && cm.showHint();
            });
            cm.on('focus', cm => !cm.state.completionActive && cm.showHint());
        }

        this.cm = cm;
    }

    getValue() {
        return this.cm.getValue();
    }

    setValue(value) {
        // call refresh() method to update sizes and content
        // use a Promise as zero timeout, like a setImmediate()
        Promise.resolve().then(() => this.cm.refresh());

        if (typeof value === 'string' && this.getValue() !== value) {
            this.cm.setValue(value || '');
        }
    }

    focus() {
        this.cm.focus();
    }

    get darkmode() {}
}

class QueryEditor extends Editor {
    constructor(getSuggestions) {
        super({ mode: 'discovery-query', hint: function(cm) {
            const cursor = cm.getCursor();
            const suggestions = getSuggestions(
                cm.getValue(),
                cm.doc.indexFromPos(cursor)
            );

            if (!suggestions) {
                return;
            }

            return {
                list: suggestions.slice(0, 50).map(entry => {
                    return {
                        entry,
                        text: entry.value,
                        render: renderQueryAutocompleteItem,
                        from: cm.posFromIndex(entry.from),
                        to: cm.posFromIndex(entry.to)
                    };
                })
            };
        } });
    }
}

class ViewEditor extends Editor {
    constructor() {
        super({
            mode: {
                name: 'discovery-view',
                isDiscoveryViewDefined: name => this.isViewDefined(name)
            }
        });
    }
}

CodeMirror.defineMode('discovery-query', function(config) {
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
});

CodeMirror.defineMode('discovery-view', function(config, options) {
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
});

export default function(discovery) {
    Object.assign(discovery.view, {
        QueryEditor: class extends QueryEditor {
            get darkmode() {
                return discovery.darkmode;
            }
        },
        ViewEditor: class extends ViewEditor {
            isViewDefined(name) {
                return discovery.view.isDefined(name);
            }
            get darkmode() {
                return discovery.darkmode;
            }
        }
    });
}
