/* eslint-env browser */

export default function(discovery) {
    discovery.view.define('auto-link', function(el, config, data, context) {
        const { content = 'text', fallback, href } = config;

        if (!data) {
            return;
        }

        const links = discovery.resolveValueLinks(data);
        const preprocessHref = typeof href === 'function' ? href : value => value;
        const processedHref = links
            ? preprocessHref(links[0].href, data, context)
            : null;

        if (processedHref) {
            return discovery.view.render(el, { view: 'link', content }, {
                ...links[0],
                href: processedHref
            }, context);
        } else {
            return discovery.view.render(el, fallback || content, data, context);
        }
    }, {
        tag: false
    });
}
