/* eslint-env browser */

import { createElement } from './dom.js';

const copyTextBufferEl = createElement('div', {
    style: [
        'position: fixed',
        'overflow: hidden',
        'font-size: 1px',
        'width: 1px',
        'height: 1px',
        'top: 0',
        'left: 0',
        'white-space: pre'
    ].join(';')
}, ['text']);

function execCommandFallback(text) {
    document.body.append(copyTextBufferEl);

    try {
        const selection = window.getSelection();
        const range = document.createRange();

        copyTextBufferEl.firstChild.nodeValue = text;
        range.selectNodeContents(copyTextBufferEl);
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand('copy');
    } finally {
        copyTextBufferEl.remove();
    }
}

export default async function copyText(text) {
    try {
        if (navigator.clipboard) {
            const permissionStatus = await navigator.permissions.query({
                name: 'clipboard-write'
            });

            if (permissionStatus.state === 'granted' || permissionStatus.state === 'prompt') {
                return navigator.clipboard.writeText(text);
            }
        }
    } catch (_) {}

    execCommandFallback(text);
}
