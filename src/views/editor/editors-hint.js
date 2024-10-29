// Fork of CodeMirror/addon/hint/show-hint.js
//
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

/* eslint-env browser */

import CodeMirror from 'codemirror';
import { getOffsetParent, getBoundingRect, getOverflowParent } from '../../core/utils/layout.js';
import { passiveCaptureOptions } from '../../core/utils/dom.js';

const POPUP_CLASS = 'discovery-view-editor-hints-popup';
const HINT_CLASS = 'discovery-view-editor-hint';
const ACTIVE_HINT_CLASS = 'active';
const requestAnimationFrame = window.requestAnimationFrame || (fn => setTimeout(fn, 1000 / 60));
const cancelAnimationFrame = window.cancelAnimationFrame || clearTimeout;

CodeMirror.commands.autocomplete = CodeMirror.showHint;
CodeMirror.defineOption('showHintOptions', null);
CodeMirror.defineExtension('showHint', function(options) {
    options = {
        closeOnUnfocus: true,
        container: null,
        ...this.options.showHintOptions,
        ...options
    };

    if (this.state.completionActive) {
        this.state.completionActive.close();
    }

    if (this.listSelections().length > 1) {
        return;
    }

    // don't allow completion when something is selected.
    if (this.somethingSelected()) {
        return;
    }

    if (typeof options.hint !== 'function') {
        return;
    }

    this.state.completionActive = new Completion(this, options);
    this.state.completionActive.update(true);

    CodeMirror.signal(this, 'startCompletion', this);
});

class Completion {
    constructor(cm, options) {
        this.cm = cm;
        this.options = options;
        this.widget = null;
        this.debounce = 0;
        this.tick = 0;
        this.startPos = this.cm.getCursor('start');
        this.startLen = this.cm.getLine(this.startPos.line).length - this.cm.getSelection().length;

        cm.on('cursorActivity', this.activityFunc = () => this.cursorActivity());

        if (options.closeOnUnfocus) {
            let closingOnBlur;
            this.onFocus = () => clearTimeout(closingOnBlur);
            this.onBlur = () => closingOnBlur = setTimeout(() => this.close(), 100);

            cm.on('focus', this.onFocus);
            cm.on('blur', this.onBlur);
        }
    }

    close() {
        if (!this.active()) {
            return;
        }

        this.cm.state.completionActive = null;
        this.tick = null;
        this.cm.off('cursorActivity', this.activityFunc);

        if (this.options.closeOnUnfocus) {
            this.cm.off('blur', this.onBlur);
            this.cm.off('focus', this.onFocus);
        }

        if (this.widget) {
            if (this.data) {
                CodeMirror.signal(this.data, 'close');
            }

            this.widget.close();
        }

        CodeMirror.signal(this.cm, 'endCompletion', this.cm);
    }

    active() {
        return this.cm.state.completionActive === this;
    }

    pick(data, idx) {
        const completion = data.list[idx];

        this.cm.state.completionEnabled = false;

        if (completion.hint) {
            completion.hint(this.cm, data, completion);
        } else {
            this.cm.replaceRange(
                getText(completion),
                completion.from || data.from,
                completion.to || data.to,
                'complete'
            );
        }

        CodeMirror.signal(data, 'pick', completion);
        this.close();
    }

    cursorActivity() {
        if (this.debounce) {
            cancelAnimationFrame(this.debounce);
            this.debounce = 0;
        }

        const pos = this.cm.getCursor();
        const line = this.cm.getLine(pos.line);
        if (pos.line != this.startPos.line || line.length - pos.ch != this.startLen - this.startPos.ch ||
            pos.ch < this.startPos.ch || this.cm.somethingSelected()) {
            this.close();
        } else {
            this.debounce = requestAnimationFrame(() => this.update());
            if (this.widget) {
                this.widget.disable();
            }
        }
    }

    update(first) {
        if (this.tick === null) {
            return;
        }

        const myTick = ++this.tick;
        Promise.resolve(this.options.hint(this.cm, this.options)).then((data) => {
            if (this.tick == myTick) {
                this.finishUpdate(data, first);
            }
        });
    }

    finishUpdate(data) {
        if (this.data) {
            CodeMirror.signal(this.data, 'update');
        }

        const picked = this.widget && this.widget.picked;

        if (this.widget) {
            this.widget.close();
        }

        this.data = data;

        if (data && data.list.length) {
            if (picked && data.list.length == 1) {
                this.pick(data, 0);
            } else {
                this.widget = new CompletionWidget(this, data);
                CodeMirror.signal(data, 'shown');
            }
        }
    }
};

function getText(completion) {
    if (typeof completion == 'string') {
        return completion;
    }

    return completion.text;
}

function getHintElement(hintsElement, el) {
    while (el && el.parentNode !== hintsElement) {
        el = el.parentNode;
    }

    return el;
}

class CompletionWidget {
    constructor(completion, data) {
        const cm = completion.cm;
        const hintsEl = this.hintsEl = document.createElement('ul');
        const hintsElClassNames = [
            POPUP_CLASS,
            completion.cm.options.theme
        ].filter(Boolean);
        const containerEl = completion.options.container || document.body;

        this.rootEls = new Set([containerEl.getRootNode()]);
        this.completion = completion;
        this.data = data;
        this.picked = false;
        this.selectedHint = data.selectedHint || 0;

        hintsEl.style.visibility = 'hidden';
        hintsEl.classList.add(...hintsElClassNames);
        containerEl.appendChild(hintsEl);

        this.items = data.list.map((cur, idx) => {
            const el = hintsEl.appendChild(document.createElement('li'));

            el.className = HINT_CLASS;

            if (idx === this.selectedHint) {
                el.classList.add(ACTIVE_HINT_CLASS);
            }

            if (cur.render) {
                cur.render(el, data, cur);
            } else {
                el.appendChild(document.createTextNode(cur.displayText || getText(cur)));
            }

            return el;
        });

        cm.addKeyMap(this.keyMap = {
            Up: () => this.changeActive(this.selectedHint - 1),
            Down: () => this.changeActive(this.selectedHint + 1),
            Enter: () => this.pick(),
            Tab: () => this.pick(),
            Esc: () => {
                cm.state.completionEnabled = false;
                completion.close();
            }
        });

        this.updatePosSize();
        this.onScroll = () => this.updatePosSize();
        for (const el of this.rootEls) {
            el.addEventListener('scroll', this.onScroll, passiveCaptureOptions);
        }

        CodeMirror.on(hintsEl, 'mousedown', (e) => {
            const el = getHintElement(hintsEl, e.target);
            const idx = this.items.indexOf(el);

            if (idx !== -1) {
                this.close();
                this.selectedHint = idx;
                this.pick();
                setTimeout(() => cm.focus(), 1);
            }
        });

        CodeMirror.signal(data, 'select', data.list[this.selectedHint], this.items[this.selectedHint]);
    }

    close() {
        if (this.completion.widget !== this) {
            return;
        }

        this.completion.widget = null;
        this.completion.cm.removeKeyMap(this.keyMap);
        this.hintsEl.remove();

        for (const el of this.rootEls) {
            el.removeEventListener('scroll', this.onScroll, passiveCaptureOptions);
        }
    }

    disable() {
        this.completion.cm.removeKeyMap(this.keyMap);
        this.keyMap = {
            Enter: () => this.picked = true
        };
        this.completion.cm.addKeyMap(this.keyMap);
    }

    pick() {
        this.completion.pick(this.data, this.selectedHint);
    }

    changeActive(idx, avoidWrap) {
        if (idx >= this.items.length) {
            idx = avoidWrap ? this.items.length - 1 : 0;
        } else if (idx < 0) {
            idx = avoidWrap ? 0 : this.items.length - 1;
        }

        const prev = this.items[this.selectedHint];
        const next = this.items[this.selectedHint = idx];

        if (next === prev) {
            return;
        }

        if (prev) {
            prev.classList.remove(ACTIVE_HINT_CLASS);
        }

        next.classList.add(ACTIVE_HINT_CLASS);

        if (next.offsetTop < this.hintsEl.scrollTop) {
            this.hintsEl.scrollTop = next.offsetTop - 3;
        } else if (next.offsetTop + next.offsetHeight > this.hintsEl.scrollTop + this.hintsEl.clientHeight) {
            this.hintsEl.scrollTop = next.offsetTop + next.offsetHeight - this.hintsEl.clientHeight + 3;
        }

        CodeMirror.signal(this.data, 'select', this.data.list[this.selectedHint], next);
    }

    getCursorCoords() {
        const { completion, hintsEl } = this;
        const cm = completion.cm;
        const offsetParent = getOffsetParent(hintsEl);
        const cursorBox = cm.cursorCoords(null, 'local'); // "local" for coords relative to editor coords
        const editorBox = getBoundingRect(cm.display.wrapper, offsetParent);

        return {
            top: editorBox.top + cursorBox.top + 5,
            left: editorBox.left + cursorBox.left + 9,
            bottom: editorBox.top + cursorBox.bottom + 5,
            right: editorBox.left + cursorBox.right + 9
        };
    }

    updatePosSize() {
        const CURSOR_OFFSET = 1;
        const PAGE_OFFSET = 6;
        const { hintsEl } = this;
        let pos = this.getCursorCoords();
        const { clientWidth: viewportW, clientHeight: viewportH } = getOverflowParent(hintsEl);

        hintsEl.style.left = '0px';
        hintsEl.style.top = '0px';
        let { width, height } = hintsEl.getBoundingClientRect();

        // vertical position
        const availBottom = viewportH - pos.bottom;
        const availTop = pos.top;

        if (availBottom < height && availTop > availBottom) {
            // up
            const h = Math.min(height, availTop - PAGE_OFFSET - CURSOR_OFFSET);
            hintsEl.style.top = `${pos.top - 1 - h - PAGE_OFFSET}px`;
            hintsEl.style.maxHeight = `${h}px`;
        } else {
            // down
            hintsEl.style.top = `${pos.bottom + CURSOR_OFFSET}px`;
            hintsEl.style.maxHeight = `${availBottom - CURSOR_OFFSET - PAGE_OFFSET}px`;
        }

        // horizontal position
        const availRight = viewportW - pos.right;
        const availLeft = pos.left;

        if (availRight < width && availLeft > availRight) {
            // left
            hintsEl.style.left = `${pos.left + 1 - Math.min(width, availLeft - PAGE_OFFSET)}px`;
            hintsEl.style.maxWidth = `${availLeft - PAGE_OFFSET}px`;
        } else {
            // right
            hintsEl.style.left = `${pos.right}px`;
            hintsEl.style.maxWidth = `${availRight - PAGE_OFFSET}px`;
        }

        hintsEl.style.visibility = 'visible';
    }
};
