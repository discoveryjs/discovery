/* eslint-env browser */

import { createElement } from '../../core/utils/dom.js';
import { escapeHtml } from '../../core/utils/html.js';
import { ContentRect } from '../../core/utils/size.js';
import Emitter from '../../core/emitter.js';
import CodeMirror from 'codemirror';
import modeQuery from './editor-mode-query.js';
import modeView from './editor-mode-view.js';
import 'codemirror/mode/javascript/javascript.js';
import './editors-hint.js';

function renderQueryAutocompleteItem(el, self, { entry: { type, text, value }}) {
    const startChar = text[0];
    const lastChar = text[text.length - 1];
    const start = startChar === '"' || startChar === "'" ? 1 : 0;
    const end = lastChar === '"' || lastChar === "'" ? 1 : 0;
    const pattern = text.toLowerCase().substring(start, text.length - end);
    const offset = pattern ? value.toLowerCase().indexOf(pattern, value[0] === '"' || value[0] === "'" ? 1 : 0) : -1;

    if (offset !== -1) {
        value = (
            escapeHtml(value.substring(0, offset)) +
            '<span class="match">' + escapeHtml(value.substr(offset, pattern.length)) + '</span>' +
            escapeHtml(value.substr(offset + pattern.length))
        );
    }

    el.classList.add('type-' + type);
    el.appendChild(createElement('span', 'name', value));
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
                if (cm.state.completionEnabled && cm.state.focused) {
                    cm.showHint();
                }
            });
            cm.on('focus', cm => {
                if (cm.getValue() === '') {
                    cm.state.completionEnabled = true;
                }

                if (cm.state.completionEnabled && !cm.state.completionActive) {
                    cm.showHint();
                }
            });
            cm.on('change', (_, change) => {
                if (change.origin !== 'complete') {
                    cm.state.completionEnabled = true;
                }
            });
        }

        this.cm = cm;

        const rect = new ContentRect();
        rect.subscribe(() => cm.refresh());
        rect.observe(cm.display.wrapper);
    }

    getValue() {
        return this.cm.getValue();
    }

    setValue(value) {
        // call refresh() method to update sizes and content
        // use a microtask to call as soon as possible after current code frame
        requestAnimationFrame(() => this.cm.refresh());

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
        super({ mode: 'discovery-query', hint: (cm) => {
            const cursor = cm.getCursor();
            const suggestions = getSuggestions(
                cm.getValue(),
                cm.doc.indexFromPos(cursor),
                this.queryData,
                this.queryContext
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

        this.inputPanelEl = createElement('div', 'discovery-editor__input-panel');
        this.outputPanelEl = createElement('div', 'discovery-editor__output-panel');
        this.el.append(this.inputPanelEl, this.outputPanelEl);
    }
    setValue(value, data, context) {
        const valueChanged = typeof value === 'string' && this.getValue() !== value;
        const dataChanged = this.queryData !== data || this.queryContext !== context;

        this.queryData = data;
        this.queryContext = context;
        super.setValue(value);

        if (dataChanged && !valueChanged) {
            if (this.cm.state.completionEnabled && this.cm.state.focused) {
                this.cm.showHint();
            }
        }
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
