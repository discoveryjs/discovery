// Fork of CodeMirror/addon/hint/show-hint.js
//
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

/* eslint-env browser */

import CodeMirror from '/gen/codemirror.js'; // FIXME: generated file to make it local

var HINT_ELEMENT_CLASS        = 'CodeMirror-hint';
var ACTIVE_HINT_ELEMENT_CLASS = 'CodeMirror-hint-active';

CodeMirror.defineExtension('showHint', function(options) {
    options = parseOptions(this, this.getCursor('start'), options);
    var selections = this.listSelections();
    if (selections.length > 1) {
        return;
    }

    // By default, don't allow completion when something is selected.
    // A hint function can have a `supportsSelection` property to
    // indicate that it can handle selections.
    if (this.somethingSelected()) {
        if (!options.hint.supportsSelection) {
            return;
        }
        // Don't try with cross-line selections
        for (var i = 0; i < selections.length; i++) {
            if (selections[i].head.line != selections[i].anchor.line) {
                return;
            }
        }
    }

    if (this.state.completionActive) {
        this.state.completionActive.close();
    }

    var completion = this.state.completionActive = new Completion(this, options);

    if (!completion.options.hint) {
        return;
    }

    CodeMirror.signal(this, 'startCompletion', this);
    completion.update(true);
});

function Completion(cm, options) {
    this.cm = cm;
    this.options = options;
    this.widget = null;
    this.debounce = 0;
    this.tick = 0;
    this.startPos = this.cm.getCursor('start');
    this.startLen = this.cm.getLine(this.startPos.line).length - this.cm.getSelection().length;

    cm.on('cursorActivity', this.activityFunc = () => this.cursorActivity());
}

var requestAnimationFrame = window.requestAnimationFrame || function(fn) {
    return setTimeout(fn, 1000 / 60);
};
var cancelAnimationFrame = window.cancelAnimationFrame || clearTimeout;

Completion.prototype = {
    close: function() {
        if (!this.active()) {
            return;
        }

        this.cm.state.completionActive = null;
        this.tick = null;
        this.cm.off('cursorActivity', this.activityFunc);

        if (this.widget) {
            if (this.data) {
                CodeMirror.signal(this.data, 'close');
            }

            this.widget.close();
        }

        CodeMirror.signal(this.cm, 'endCompletion', this.cm);
    },

    active: function() {
        return this.cm.state.completionActive == this;
    },

    pick: function(data, i) {
        var completion = data.list[i];
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
    },

    cursorActivity: function() {
        if (this.debounce) {
            cancelAnimationFrame(this.debounce);
            this.debounce = 0;
        }

        var pos = this.cm.getCursor();
        var line = this.cm.getLine(pos.line);
        if (pos.line != this.startPos.line || line.length - pos.ch != this.startLen - this.startPos.ch ||
                pos.ch < this.startPos.ch || this.cm.somethingSelected() ||
                (!pos.ch || this.options.closeCharacters.test(line.charAt(pos.ch - 1)))) {
            this.close();
        } else {
            this.debounce = requestAnimationFrame(() => this.update());
            if (this.widget) {
                this.widget.disable();
            }
        }
    },

    update: function(first) {
        if (this.tick == null) {
            return;
        }

        var myTick = ++this.tick;

        Promise.resolve(this.options.hint(this.cm, this.options)).then((data) => {
            if (this.tick == myTick) {
                this.finishUpdate(data, first);
            }
        });
    },

    finishUpdate: function(data) {
        if (this.data) {
            CodeMirror.signal(this.data, 'update');
        }

        var picked = (this.widget && this.widget.picked);

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

function parseOptions(cm, pos, options) {
    var editor = cm.options.hintOptions;
    var out = Object.assign({}, defaultOptions, editor, options);

    return out;
}

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

function Widget(completion, data) {
    var cm = completion.cm;
    var theme = completion.cm.options.theme;
    var hintsEl = this.hintsEl = document.createElement('ul');

    this.completion = completion;
    this.data = data;
    this.picked = false;
    this.selectedHint = data.selectedHint || 0;

    hintsEl.className = 'CodeMirror-hints ' + theme;
    (completion.options.container || document.body).appendChild(hintsEl);

    this.items = data.list.map((cur, i) => {
        var el = hintsEl.appendChild(document.createElement('li'));

        el.className = HINT_ELEMENT_CLASS;

        if (i === this.selectedHint) {
            el.classList.add(ACTIVE_HINT_ELEMENT_CLASS);
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
        Esc: () => completion.close()
    });

    if (completion.options.closeOnUnfocus) {
        var closingOnBlur;
        cm.on('blur', this.onBlur = function() {
            closingOnBlur = setTimeout(() => completion.close(), 100);
        });
        cm.on('focus', this.onFocus = () => clearTimeout(closingOnBlur));
    }

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
    return true;
}

Widget.prototype = {
    close: function() {
        if (this.completion.widget !== this) {
            return;
        }

        this.completion.widget = null;
        this.completion.cm.removeKeyMap(this.keyMap);
        this.hintsEl.remove();

        var cm = this.completion.cm;
        if (this.completion.options.closeOnUnfocus) {
            cm.off('blur', this.onBlur);
            cm.off('focus', this.onFocus);
        }

        document.removeEventListener('scroll', this.onScroll, true);
    },

    disable: function() {
        this.completion.cm.removeKeyMap(this.keyMap);
        this.keyMap = {
            Enter: () => this.picked = true
        };
        this.completion.cm.addKeyMap(this.keyMap);
    },

    pick: function() {
        this.completion.pick(this.data, this.selectedHint);
    },

    changeActive: function(i, avoidWrap) {
        if (i >= this.items.length) {
            i = avoidWrap ? this.items.length - 1 : 0;
        } else if (i < 0) {
            i = avoidWrap ? 0 : this.items.length - 1;
        }

        const prev = this.items[this.selectedHint];
        const next = this.items[this.selectedHint = i];

        if (next === prev) {
            return;
        }

        if (prev) {
            prev.classList.remove(ACTIVE_HINT_ELEMENT_CLASS);
        }

        next.classList.add(ACTIVE_HINT_ELEMENT_CLASS);

        if (next.offsetTop < this.hintsEl.scrollTop) {
            this.hintsEl.scrollTop = next.offsetTop - 3;
        } else if (next.offsetTop + next.offsetHeight > this.hintsEl.scrollTop + this.hintsEl.clientHeight) {
            this.hintsEl.scrollTop = next.offsetTop + next.offsetHeight - this.hintsEl.clientHeight + 3;
        }

        CodeMirror.signal(this.data, 'select', this.data.list[this.selectedHint], next);
    },

    updatePosSize: function() {
        const { completion, hintsEl, data } = this;
        const cm = completion.cm;
        var pos = cm.cursorCoords(completion.options.alignWithWord ? data.from : null);
        var left = pos.left;
        var top = pos.bottom;
        hintsEl.style.left = left + 'px';
        hintsEl.style.top = top + 'px';
        // If we're at the edge of the screen, then we want the menu to appear on the left of the cursor.
        var winW = window.innerWidth;
        var winH = window.innerHeight;
        var box = hintsEl.getBoundingClientRect();
        var overlapY = box.bottom - winH;

        if (overlapY > 0) {
            var height = box.bottom - box.top;
            var curTop = pos.top - (pos.bottom - box.top);
            if (curTop - height > 0) { // Fits above cursor
                hintsEl.style.top = (top = pos.top - height) + 'px';
            } else if (height > winH) {
                hintsEl.style.height = (winH - 5) + 'px';
                hintsEl.style.top = (top = pos.bottom - box.top) + 'px';
                var cursor = cm.getCursor();
                if (data.from.ch != cursor.ch) {
                    pos = cm.cursorCoords(cursor);
                    hintsEl.style.left = (left = pos.left) + 'px';
                    box = hintsEl.getBoundingClientRect();
                }
            }
        }

        var overlapX = box.right - winW;
        if (overlapX > 0) {
            if (box.right - box.left > winW) {
                hintsEl.style.width = (winW - 5) + 'px';
                overlapX -= (box.right - box.left) - winW;
            }
            hintsEl.style.left = (left = pos.left - overlapX) + 'px';
        }
    }
};

CodeMirror.registerHelper('hint', 'auto');
CodeMirror.commands.autocomplete = CodeMirror.showHint;

var defaultOptions = {
    hint: CodeMirror.hint.auto,
    alignWithWord: true,
    closeCharacters: /[\s()\[\]{};:>,]/,
    closeOnUnfocus: true,
    container: null
};

CodeMirror.defineOption('hintOptions', null);
