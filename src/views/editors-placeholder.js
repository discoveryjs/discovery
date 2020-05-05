// Fork of CodeMirror/addon/display/placeholder.js

/* eslint-env browser */

import CodeMirror from '/gen/codemirror.js'; // FIXME: generated file to make it local

CodeMirror.defineOption('placeholder', '', function(cm, val, old) {
    const prev = old && old != CodeMirror.Init;

    if (val && !prev) {
        cm.on('change', onChange);
        cm.on('swapDoc', onChange);
        setPlaceholder(cm, val);
        onChange(cm);
    } else if (!val && prev) {
        cm.off('change', onChange);
        cm.off('swapDoc', onChange);
        clearPlaceholder(cm);
        cm.getWrapperElement().classList.remove('CodeMirror-empty');
    }
});

function clearPlaceholder(cm) {
    if (cm.state.placeholder) {
        cm.state.placeholder.remove();
        cm.state.placeholder = null;
    }
}
function setPlaceholder(cm, placeholder) {
    const elt = cm.state.placeholder = document.createElement('pre');
    elt.style.direction = cm.getOption('direction');
    elt.className = 'CodeMirror-placeholder CodeMirror-line-like';

    elt.append(document.createTextNode(placeholder));
    cm.display.lineSpace.prepend(elt);
}

function onChange(cm) {
    const isEmpty = cm.lineCount() === 1 && cm.getLine(0) === '';

    cm.getWrapperElement().classList.toggle('CodeMirror-empty', isEmpty);
}
