/* eslint-env browser */

export default function(discovery) {
    discovery.view.define('image-preview', function(el, config) {
        this.render(el, {
            view: 'image',
            ...config
        });
    });
}
