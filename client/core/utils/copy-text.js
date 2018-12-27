/* eslint-env browser */

const copyTextBufferEl = document.createElement('textarea');

Object.assign(copyTextBufferEl, {
    position: 'fixed',
    width: '1px',
    height: '1px',
    top: '0px',
    left: '-100px'
});

export default function copyText(text) {
    document.body.appendChild(copyTextBufferEl);
    copyTextBufferEl.value = text;
    copyTextBufferEl.select();

    try {
        document.execCommand('copy');
    } catch (err) {
        // do nothing
    }

    window.getSelection().removeAllRanges();
    copyTextBufferEl.remove();
};
