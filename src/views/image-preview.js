/* eslint-env browser */

export default function(host) {
    host.view.define('image-preview', function(el, config) {
        this.render(el, {
            view: 'image',
            ...config
        });
    });
}
