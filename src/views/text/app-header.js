import { createElement } from '../../core/utils/index.js';
import usage from './app-header.usage.js';

const props = `is not array? | {
    name: name or "Untitled app",
    icon,
    version,
    description
} | overrideProps() | {
    ...,
    icon is string and $ ~= /\\S/?,
    version is string and $ ~= /\\S/?,
    description is string and $ ~= /\\S/?
}`;

export default function(host) {
    host.view.define('app-header', function(el, props) {
        const { name, icon, version, description } = props;
        const headerEl = createElement('h1', null, version
            ? [name, createElement('span', 'version', version)]
            : [name]
        );

        if (icon) {
            el.style.setProperty('--icon', /^(?:\.|\/|data:|https?:)/.test(icon)
                ? `url(${JSON.stringify(icon)})`
                : icon
            );
        }

        el.append(
            createElement('div', 'icon'),
            createElement('div', 'content', description
                ? [headerEl, createElement('div', 'description', description)]
                : [headerEl]
            )
        );
    }, { props, usage });
}
