/* eslint-env browser */
import usage from './image.usage.js';

const props = `{
    ...#.props,
    src: #.props has no 'src' ? imagesrc()
} | overrideProps()`;

export default function(host) {
    host.view.define('image', function(el, config) {
        for (const [key, value] of Object.entries(config)) {
            if (value !== undefined) {
                el[key] = value;
            }
        }

        el.onerror = () => el.classList.add('error');
        el.onload = () => el.classList.add('loaded');
    }, { tag: 'img', props, usage });
}
