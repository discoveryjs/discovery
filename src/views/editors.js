/* eslint-env browser */

import { createElement } from '../core/utils/dom.js';
import { escapeHtml } from '../core/utils/html.js';
import Emitter from '../core/emitter.js';
import CodeMirror from 'codemirror';
import modeQuery from './editor-mode-query';
import modeView from './editor-mode-view';
import 'codemirror/mode/javascript/javascript';
import './editors-hint.js';

function getMethodPostfix(value, type) {
    if (type === 'method' && !value.includes('(')) {
        return '()';
    }
}

function renderQueryAutocompleteItem(el, self, { entry: { value, current, type }}) {
    const startChar = current[0];
    const lastChar = current[current.length - 1];
    const start = startChar === '"' || startChar === "'" ? 1 : 0;
    const end = lastChar === '"' || lastChar === "'" ? 1 : 0;
    const pattern = current.toLowerCase().substring(start, current.length - end);
    const offset = pattern ? value.toLowerCase().indexOf(pattern, value[0] === '"' || value[0] === "'" ? 1 : 0) : -1;
    const postfix = getMethodPostfix(value, type);

    if (offset !== -1) {
        value = (
            escapeHtml(value.substring(0, offset)) +
            '<span class="match">' + escapeHtml(value.substr(offset, pattern.length)) + '</span>' +
            escapeHtml(value.substr(offset + pattern.length))
        );
    }

    if (postfix) {
        value += `<span class="postfix">${postfix}</span>`;
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
            extraKeys: { 'Ctrl-Space': 'showHint' },
            mode: mode || 'javascript',
            theme: 'neo',
            indentUnit: 0,
            showHintOptions: {
                hint,
                get container() {
                    return self.container;
                }
            }
        });

        CodeMirror.commands.showHint = (cm)=>{
            cm.showHint();
        };

        cm.on('change', () => this.emit('change', cm.getValue()));

        const completionTriggerType = ['variable', 'property', 'operator'];
        const completionTriggerKeys = ['.', '$'];

        cm.on('keyup', function(editor, event) {
            if (event.keyCode < 48) {
                return;
            }

            const cursor = editor.getDoc().getCursor();
            const token = editor.getTokenAt(cursor);

            if (!completionTriggerType.includes(token.type) && !completionTriggerKeys.includes(token.string)) {
                return;
            }

            if (!editor.state.completionActive) {
                editor.showHint();
            }
        });

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
            get container() {
                return host.dom.container;
            }
        },
        ViewEditor: class extends ViewEditor {
            isViewDefined(name) {
                return host.view.isDefined(name);
            }
        }
    });
}
