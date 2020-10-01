/* eslint-env browser */

import { createElement } from '../core/utils/dom.js';
import { escapeHtml } from '../core/utils/html.js';
import Emitter from '../core/emitter.js';
import renderUsage from '../views/_usage.js';
import CodeMirror from '/gen/codemirror.js'; // FIXME: generated file to make it local
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

        const cm = CodeMirror(this.el, {
            extraKeys: { 'Alt-Space': 'autocomplete' },
            mode: mode || 'javascript',
            theme: 'neo',
            indentUnit: 0,
            showHintOptions: {
                hint,
                isolateStyleMarker: this.getIsolateStyleMarker()
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

    getIsolateStyleMarker() {}
}

class QueryEditor extends Editor {
    constructor(getSuggestions) {
        super({ hint: function(cm) {
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

let viewHintPopup = null;
class ViewEditor extends Editor {
    constructor() {
        super({ mode: 'discovery-view' });

        this.cm.isDiscoveryViewDefined = name => this.isViewDefined(name);

        if (viewHintPopup === null) {
            viewHintPopup = this.createHintPopup();
        }
    }
}

CodeMirror.defineMode('discovery-view', function(config) {
    const jsMode = CodeMirror.getMode(config, 'javascript');

    return {
        ...jsMode,
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
                const content = stream.string.slice(start + 1, end - 1).split(':')[0];
                const cm = stream.lineOracle.doc.cm;

                if (cm.isDiscoveryViewDefined(content)) {
                    stream.pos = start + 1;
                    state.suspendTokens = [
                        { pos: start + 1 + content.length, token: 'string discovery-token-hint' },
                        { pos: end, token }
                    ];

                    return token;
                }
            }

            return token;
        }
    };
});

export default function(discovery) {
    Object.assign(discovery.view, {
        QueryEditor: class extends QueryEditor {
            getIsolateStyleMarker() {
                return discovery.isolateStyleMarker;
            }
        },
        ViewEditor: class extends ViewEditor {
            isViewDefined(name) {
                return discovery.view.isDefined(name);
            }
            getIsolateStyleMarker() {
                return discovery.isolateStyleMarker;
            }
            createHintPopup() {
                return new discovery.view.Popup({
                    className: 'view-editor-view-list-hint',
                    hoverTriggers: '.view-editor-view-list .item.with-usage',
                    hoverPin: 'trigger-click',
                    render: function(popupEl, triggerEl) {
                        discovery.view.render(popupEl, {
                            view: 'block',
                            className: 'content',
                            content: renderUsage(discovery)
                        }, discovery.view.get(triggerEl.textContent), {});
                    }
                });
            }
        }
    });
}
