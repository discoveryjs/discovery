/* eslint-env browser */

export default function(discovery) {
    discovery.view.define('auto-link', function(el, config, data, context) {
        const { content, fallback, href } = config;

        if (!data) {
            return;
        }

        const links = discovery.resolveValueLinks(data);
        console.log(links);
        const preprocessHref = typeof href === 'function' ? href : value => value;
        const processedHref = links
            ? preprocessHref(links[0].href, data, context)
            : null;

        if (processedHref) {
            discovery.view.render(el, { view: 'link', content }, {
                ...links[0],
                href: processedHref
            }, context);
        } else {
            discovery.view.render(el, fallback || content || 'text', data, context);
        }
    }, {
        tag: false
    });
}
