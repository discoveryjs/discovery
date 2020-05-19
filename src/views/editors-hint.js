// Fork of CodeMirror/addon/hint/show-hint.js
//
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

/* eslint-env browser */

import CodeMirror from '/gen/codemirror.js'; // FIXME: generated file to make it local

const POPUP_CLASS = 'discovery-view-editor-hints-popup';
const HINT_CLASS = 'discovery-view-editor-hint';
const ACTIVE_HINT_CLASS = 'active';
const requestAnimationFrame = window.requestAnimationFrame || (fn => setTimeout(fn, 1000 / 60));
const cancelAnimationFrame = window.cancelAnimationFrame || clearTimeout;

CodeMirror.commands.autocomplete = CodeMirror.showHint;
CodeMirror.defineOption('showHintOptions', null);
CodeMirror.defineExtension('showHint', function(options) {
    options = {
        closeOnUnfocus: false,
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
                this.widget = new Widget(this, data);
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

class Widget {
    constructor(completion, data) {
        const cm = completion.cm;
        const hintsEl = this.hintsEl = document.createElement('div');
        const hintsElClassNames = [
            POPUP_CLASS,
            completion.cm.options.theme,
            completion.options.isolateStyleMarker
        ].filter(Boolean);

        this.completion = completion;
        this.data = data;
        this.picked = false;
        this.selectedHint = -1;

        hintsElClassNames.forEach(className => hintsEl.classList.add(className));
        (completion.options.container || document.body).appendChild(hintsEl);

        this.listEl = hintsEl.appendChild(document.createElement('div'));
        this.detailsEl = hintsEl.appendChild(document.createElement('div'));
        this.items = data.list.map((item) => {
            const el = this.listEl.appendChild(document.createElement('div'));

            el.className = HINT_CLASS;

            if (item.render) {
                item.render(el, data, item);
            } else {
                el.appendChild(document.createTextNode(item.displayText || getText(item)));
            }

            return el;
        });

        this.changeActive(data.selectedHint || 0);

        cm.addKeyMap(this.keyMap = {
            Up: () => this.changeActive(this.selectedHint - 1),
            Down: () => this.changeActive(this.selectedHint + 1),
            Enter: () => this.pick(),
            Tab: () => this.pick(),
            Esc: () => completion.close()
        });

        this.updatePosSize();
        document.addEventListener('scroll', this.onScroll = () => this.updatePosSize(), true);

        CodeMirror.on(hintsEl, 'mousedown', () => setTimeout(() => cm.focus(), 20));
        CodeMirror.on(hintsEl, 'click', (e) => {
            const el = getHintElement(hintsEl, e.target);
            const idx = this.items.indexOf(el);

            if (idx !== -1) {
                this.changeActive(idx);
                this.pick();
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

        document.removeEventListener('scroll', this.onScroll, true);
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
        const nextItemData = this.data.list[this.selectedHint];

        if (next === prev) {
            return;
        }

        if (prev) {
            prev.classList.remove(ACTIVE_HINT_CLASS);
        }

        next.classList.add(ACTIVE_HINT_CLASS);

        if (typeof nextItemData.renderDetails === 'function') {
            this.detailsEl.hidden = false;
            this.detailsEl.innerHTML = '';
            nextItemData.renderDetails(this.detailsEl, nextItemData.entry.value);
        } else {
            this.detailsEl.hidden = true;
        }

        if (next.offsetTop < this.listEl.scrollTop) {
            this.listEl.scrollTop = next.offsetTop - 3;
        } else if (next.offsetTop + next.offsetHeight > this.listEl.scrollTop + this.listEl.clientHeight) {
            this.listEl.scrollTop = next.offsetTop + next.offsetHeight - this.listEl.clientHeight + 3;
        }

        CodeMirror.signal(this.data, 'select', this.data.list[this.selectedHint], next);
    }

    updatePosSize() {
        const { completion, hintsEl, data } = this;
        const cm = completion.cm;
        let pos = cm.cursorCoords();
        let left = pos.left;
        let top = pos.bottom;
        hintsEl.style.left = left + 'px';
        hintsEl.style.top = top + 'px';
        // If we're at the edge of the screen, then we want the menu to appear on the left of the cursor.
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        let box = hintsEl.getBoundingClientRect();
        let overlapY = box.bottom - winH;

        if (overlapY > 0) {
            const height = box.bottom - box.top;
            const curTop = pos.top - (pos.bottom - box.top);
            if (curTop - height > 0) { // Fits above cursor
                hintsEl.style.top = (top = pos.top - height) + 'px';
            } else if (height > winH) {
                hintsEl.style.height = (winH - 5) + 'px';
                hintsEl.style.top = (top = pos.bottom - box.top) + 'px';
                const cursor = cm.getCursor();
                if (data.from.ch != cursor.ch) {
                    pos = cm.cursorCoords(cursor);
                    hintsEl.style.left = (left = pos.left) + 'px';
                    box = hintsEl.getBoundingClientRect();
                }
            }
        }

        let overlapX = box.right - winW;
        if (overlapX > 0) {
            if (box.right - box.left > winW) {
                hintsEl.style.width = (winW - 5) + 'px';
                overlapX -= (box.right - box.left) - winW;
            }
            hintsEl.style.left = (left = pos.left - overlapX) + 'px';
        }
    }
};
