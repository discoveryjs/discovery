/* eslint-env browser */

import { createElement } from '../core/utils/dom.js';
import { escapeHtml } from '../core/utils/html.js';
import Emitter from '../core/emitter.js';
import CodeMirror from '/gen/codemirror.js'; // FIXME: generated file to make it local
import './editors-hint.js';
import './editors-placeholder.js';

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
    constructor(options) {
        const { autocomplete } = options;

        super();

        this.el = document.createElement('div');
        this.el.className = 'discovery-editor';

        const cm = CodeMirror(this.el, {
            ...options,
            extraKeys: {
                'Alt-Space': 'autocomplete',
                'Shift-Tab': false,
                Tab: false
            },
            mode: 'javascript',
            theme: 'neo',
            indentUnit: 0,
            hintOptions: autocomplete && {
                hint: autocomplete,
                completeSingle: false,
                closeOnUnfocus: true,
                isolateStyleMarker: this.getIsolateStyleMarker()
            }
        });

        cm.on('change', () => this.emit('change', cm.getValue()));

        if (autocomplete) {
            // patch prepareSelection to inject a context hint
            // const ps = cm.display.input.prepareSelection;
            // cm.display.input.prepareSelection = function(...args) {
            //     const selection = ps.apply(this, args);
            //     if (selection.cursors.firstChild) {
            //         selection.cursors.firstChild.appendChild(createElement('div', 'context-hint', 'asd'));
            //     }
            //     return selection;
            // };

            cm.on('cursorActivity', cm => cm.state.focused && cm.showHint(autocomplete));
            cm.on('focus', cm => !cm.state.completionActive && cm.showHint(autocomplete));
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

    getIsolateStyleMarker() {}
}

class QueryEditor extends Editor {
    constructor(options) {
        const { autocomplete } = options || {};

        super({
            ...options,
            autocomplete: function(cm) {
                const cursor = cm.getCursor();
                const suggestions = autocomplete(
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
            }
        });
    }
}

class ViewEditor extends Editor {
    constructor(options) {
        super({ ...options });
    }
}

export default function(discovery) {
    Object.assign(discovery.view, {
        QueryEditor: class extends QueryEditor {
            getIsolateStyleMarker() {
                return discovery.isolateStyleMarker;
            }
        },
        ViewEditor: class extends ViewEditor {
            getIsolateStyleMarker() {
                return discovery.isolateStyleMarker;
            }
        }
    });
}
