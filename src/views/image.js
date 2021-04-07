/* eslint-env browser */
export default function(discovery) {
    discovery.view.define('image', function(el, config) {
        Object.assign(el, config);
        el.onerror = () => el.classList.add('error');
        el.onload = () => el.classList.add('loaded');
    }, { tag: 'img' });
}
