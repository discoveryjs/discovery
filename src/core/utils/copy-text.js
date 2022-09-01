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
        return Promise.reject(err);
    }

    selection.removeAllRanges();
    copyTextBufferEl.remove();

    return Promise.resolve();
}

export default async function copyText(text) {
    if (navigator.clipboard) {
        let permissionStatus;

        try {
            permissionStatus = await navigator.permissions.query({
                name: 'clipboard-write'
            });
        } catch (_) {
            return execCommandFallback(text);
        }

        if (permissionStatus.state === 'granted' || permissionStatus.state === 'prompt') {
            return navigator.clipboard.writeText(text);
        }
    }

    return execCommandFallback(text);
}
