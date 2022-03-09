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
    let selection = window.getSelection();
    let range = document.createRange();

    document.body.appendChild(copyTextBufferEl);
    copyTextBufferEl.firstChild.nodeValue = text;

    range.selectNodeContents(copyTextBufferEl);
    selection.removeAllRanges();
    selection.addRange(range);

    try {
        document.execCommand('copy');
    } catch (err) {
        console.error(err);
    }

    selection.removeAllRanges();
    copyTextBufferEl.remove();
}

export default async function copyText(text) {
    if (navigator.clipboard) {
        const permissionStatus = await navigator.permissions.query({
            name: 'clipboard-write'
        });

        if (permissionStatus.state === 'granted' || permissionStatus.state === 'prompt') {
            return navigator.clipboard.writeText(text);
        }
    }

    execCommandFallback(text);
    return Promise.resolve();
}
