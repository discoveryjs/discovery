/* eslint-env browser */

import type { ViewModel } from '../../main/view-model.js';
import type { Suggestion } from '../../main/query-suggestions.js';
import { createElement } from '../../core/utils/dom.js';
import { escapeHtml } from '../../core/utils/html.js';
import { ContentRect } from '../../core/utils/size.js';
import { Emitter } from '../../core/emitter.js';
import CodeMirror from 'codemirror';
import modeQuery from './editor-mode-query.js';
import modeView from './editor-mode-view.js';
import 'codemirror/mode/javascript/javascript.js';
import './editors-hint.js';

type CodeMirrorChange = {
    origin: string;
};
export type EditorOptions = {
    mode: string | { name: string; isDiscoveryViewDefined?: (name: string) => boolean; };
    placeholder: string;
    hint: EditorHintOptions['hint'];
};
export type EditorHintOptions = {
    closeOnUnfocus: boolean;
    container: HTMLElement;
    hint(cm: CodeMirror): null | EditorHintResult;
};
export type EditorHintResult = { list: EditorHintSuggestion[]; };
export type EditorHintSuggestion = {
    entry: Suggestion;
    text: string;
    render(el: HTMLElement, result: EditorHintResult, suggestion: EditorHintSuggestion): void;
    from: number;
    to: number;
};

// Workaround to prevent warning in Chrome: [Violation] Added non-passive event listener to a scroll-blocking <some> event. Consider marking event handler as 'passive' to make the page more responsive. See <URL>
// GitHub issue: https://github.com/codemirror/codemirror5/issues/6735
Object.defineProperty(CodeMirror.prototype, 'display', {
    configurable: true,
    set(value) {
        value.scroller.addEventListener = function(eventName: string, cb: () => void, options: any) {
            EventTarget.prototype.addEventListener.call(this, eventName, cb, typeof options !== 'boolean' ? options : {
                capture: options,
                passive: ['touchstart', 'touchmove', 'wheel', 'mousewheel'].includes(eventName)
            });
        };

        Object.defineProperty(this, 'display', {
            configurable: true,
            enumerable: true,
            value
        });

        return value;
    }
});

const renderQueryAutocompleteItem: EditorHintSuggestion['render'] = (el, _, { entry: { type, text, value } }) => {
    const startChar = text[0];
    const lastChar = text[text.length - 1];
    const start = startChar === '"' || startChar === "'" ? 1 : 0;
    const end = lastChar === '"' || lastChar === "'" ? 1 : 0;
    const pattern = text.toLowerCase().substring(start, text.length - end);
    const offset = pattern ? value.toLowerCase().indexOf(pattern, value[0] === '"' || value[0] === "'" ? 1 : 0) : -1;

    if (offset !== -1) {
        value = (
            escapeHtml(value.substring(0, offset)) +
            '<span class="match">' + escapeHtml(value.slice(offset, offset + pattern.length)) + '</span>' +
            escapeHtml(value.slice(offset + pattern.length))
        );
    }

    el.classList.add('type-' + type);
    el.appendChild(createElement('span', 'name', value));
};

export class Editor extends Emitter<{
    change: [newValue: string];
}> {
    static CodeMirror = CodeMirror;

    el: HTMLElement;
    cm: CodeMirror;

    get container(): HTMLElement | null {
        return null;
    }

    constructor({ hint, mode, placeholder }: Partial<EditorOptions>) {
        super();

        this.el = document.createElement('div');
        this.el.className = 'discovery-view-editor empty-value';

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

        cm.display.lineDiv.parentNode.dataset.placeholder = placeholder;
        cm.on('change', () => {
            const newValue = cm.getValue();

            this.el.classList.toggle('empty-value', newValue === '');
            this.emit('change', newValue);
        });

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

            cm.on('cursorActivity', (cm: CodeMirror) => {
                if (cm.state.completionEnabled && cm.state.focused) {
                    cm.showHint();
                }
            });
            cm.on('focus', (cm: CodeMirror) => {
                if (cm.getValue() === '') {
                    cm.state.completionEnabled = true;
                }

                if (cm.state.completionEnabled && !cm.state.completionActive) {
                    cm.showHint();
                }
            });
            cm.on('change', (_, change: CodeMirrorChange) => {
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

    setValue(value: string) {
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

export class QueryEditor extends Editor {
    private queryData: unknown;
    private queryContext: unknown;
    inputPanelEl: HTMLElement;
    outputPanelEl: HTMLElement;

    constructor(getSuggestions: (value: string, offset: number, data: unknown, context: unknown) => Suggestion[] | null) {
        super({ mode: 'discovery-query', placeholder: 'Enter a jora query', hint: (cm: CodeMirror) => {
            const cursor = cm.getCursor();
            const suggestions = getSuggestions(
                cm.getValue(),
                cm.doc.indexFromPos(cursor),
                this.queryData,
                this.queryContext
            );

            if (!suggestions) {
                return null;
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

        this.inputPanelEl = createElement('div', 'discovery-view-editor__input-panel');
        this.outputPanelEl = createElement('div', 'discovery-view-editor__output-panel');
        this.el.append(this.inputPanelEl, this.outputPanelEl);
    }

    setValue(value: string, data?: unknown, context?: unknown) {
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

export class ViewEditor extends Editor {
    constructor() {
        super({
            mode: {
                name: 'discovery-view',
                isDiscoveryViewDefined: (name: string) => this.isViewDefined(name)
            }
        });
    }

    isViewDefined(name: string): boolean;
    isViewDefined() {
        return false;
    }
}

CodeMirror.defineMode('jora', modeQuery);
CodeMirror.defineMode('discovery-query', modeQuery);
CodeMirror.defineMode('discovery-view', modeView);

export default function(host: ViewModel) {
    Object.assign(host.view, {
        QueryEditor: class extends QueryEditor {
            get container() {
                return host.dom.container;
            }
        },
        ViewEditor: class extends ViewEditor {
            isViewDefined(name: string) {
                return host.view.isDefined(name);
            }
        }
    });
}
