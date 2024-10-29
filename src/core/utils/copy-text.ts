/* eslint-env browser */

import { createElement } from './dom.js';

function execCommandFallback(text: string) {
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
    });

    document.body.append(copyTextBufferEl);

    try {
        const selection = window.getSelection();
        const range = document.createRange();

        copyTextBufferEl.append(text);
        range.selectNodeContents(copyTextBufferEl);
        selection?.removeAllRanges();
        selection?.addRange(range);
        document.execCommand('copy');
    } finally {
        copyTextBufferEl.remove();
    }
}

export async function copyText(text: string) {
    try {
        if (navigator.clipboard) {
            const permissionStatus = await navigator.permissions.query({
                name: 'clipboard-write' as PermissionName // see https://github.com/microsoft/TypeScript-DOM-lib-generator/issues/1245
            });

            if (permissionStatus.state === 'granted' || permissionStatus.state === 'prompt') {
                return navigator.clipboard.writeText(text);
            }
        }
    } catch {}

    execCommandFallback(text);
}
