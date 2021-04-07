/* eslint-env browser */

export default function(host) {
    host.view.define('auto-link', function(el, config, data, context) {
        const { content, fallback, href } = config;

        if (!data) {
            return;
        }

        const links = host.resolveValueLinks(data);
        const preprocessHref = typeof href === 'function' ? href : value => value;
        const processedHref = links
            ? preprocessHref(links[0].href, data, context)
            : null;

        if (processedHref) {
            return host.view.render(el, { view: 'link', content }, {
                ...links[0],
                href: processedHref
            }, context);
        } else {
            return host.view.render(el, fallback || content || 'text', data, context);
        }
    }, {
        tag: false
    });
}
