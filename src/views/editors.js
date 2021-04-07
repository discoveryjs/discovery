/* eslint-env browser */

import { createElement } from '../core/utils/dom.js';
import { escapeHtml } from '../core/utils/html.js';
import Emitter from '../core/emitter.js';
import CodeMirror from 'codemirror';
import modeQuery from './editor-mode-query';
import modeView from './editor-mode-view';
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
                get container() {
                    return self.container;
                },
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

CodeMirror.defineMode('jora', modeQuery);
CodeMirror.defineMode('discovery-query', modeQuery);
CodeMirror.defineMode('discovery-view', modeView);

export default function(host) {
    Object.assign(host.view, {
        QueryEditor: class extends QueryEditor {
            get darkmode() {
                return host.darkmode;
            }
            get container() {
                return host.dom.container;
            }
        },
        ViewEditor: class extends ViewEditor {
            isViewDefined(name) {
                return host.view.isDefined(name);
            }
            get darkmode() {
                return host.darkmode;
            }
        }
    });
}
