/* eslint-env browser */

import usage from './image-preview.usage.js';

export default function(host) {
    host.view.define('image-preview', function(el, config, data, context) {
        this.render(el, {
            view: 'image',
            ...config
        }, data, context);
    }, { usage });
}
