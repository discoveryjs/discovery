/* eslint-env browser */

import * as base64 from '../core/utils/base64.js';

export default function(discovery) {
    discovery.view.define('image-preview', function(el, config, data) {
        let { content, binary, mime } = data || {};

        el.hidden = true;

        if (/^image\//i.test(mime)) {
            el.hidden = false;

            if (!binary) {
                content = base64.encode(content);
            }

            el.innerHTML = `<img src="data:${mime};base64,${content}">`;
        }
    });
}
