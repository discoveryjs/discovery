/* eslint-env browser */
import { marked } from 'marked';
import usage from './markdown.usage.js';
import { escapeHtml } from '../../core/utils/html.js';

class CustomRenderer extends marked.Renderer {
    heading(text, level, raw, slugger) {
        const { discovery: host, anchors } = this.options;
        const slug = slugger.slug(raw);
        let anchor = '';

        if (anchors) {
            const href = host.encodePageHash(
                host.pageId,
                host.pageRef,
                { ...host.pageParams, '!anchor': slug }
            );

            anchor = `<a class="view-header__anchor" id="!anchor:${escapeHtml(slug)}" href="${href}"></a>`;
        }

        return `<h${level} class="view-header view-h${level}" data-slug="${slug}">${anchor}${text}</h${level}>\n`;
    }

    link(href, title, text) {
        if (href === null) {
            return text;
        }

        let out = '<a class="view-link" href="' + escapeHtml(href) + '"';

        if (title) {
            out += ' title="' + escapeHtml(title) + '"';
        }

        if (!href.startsWith('#')) {
            out += ' target="_blank"';
        }

        out += '>' + text + '</a>';

        return out;
    }

    checkbox(checked) {
        return (
            '<label class="view-checkbox"><input type="checkbox" disabled' +
            (checked ? ' checked' : '') +
            '/></label> '
        );
    }

    list(body, ordered, start) {
        const tag = ordered ? 'ol' : 'ul';
        const startAttr = ordered && start !== 1 ? ` start="${start}"` : '';

        return (
            `<${tag} class="view-${tag}"${startAttr}>\n` +
            body +
            `\n</${tag}>\n`
        );
    }
    listitem(text) {
        return '<li class="view-list-item">' + text + '</li>\n';
    }

    table(header, body) {
        return '<table class="view-table">\n' +
            '<thead>\n' +
            header.replace(/ class="view-table-row"/g, '') +
            '</thead>\n' +
            (body ? '<tbody>' + body + '</tbody>' : '') +
            '</table>\n';
    }

    tablerow(content) {
        return '<tr class="view-table-row">\n' + content + '</tr>\n';
    }

    tablecell(content, flags) {
        const type = flags.header ? 'th' : 'td';

        return (
            `<${type} class="view-table-cell"${flags.align ? ` align="${flags.align}"` : ''}>` +
            content +
            `</${type}>\n`
        );
    }
}

marked.setOptions({
    smartLists: true,
    langPrefix: 'discovery-markdown-',
    renderer: new CustomRenderer()
});

export default function(host) {
    const opts = {
        discovery: host
    };

    function applyTextInterpolation(value, values) {
        return value.replace(/{{(\d+)}}/gs, (_, index) => values[index]);
    }

    function applyInterpolations(el, values) {
        for (const child of el.childNodes) {
            switch (child.nodeType) {
                case document.ELEMENT_NODE:
                    if (!child.classList.contains('view-source')) {
                        applyInterpolations(child, values);

                        for (const attribute of child.attributes) {
                            attribute.nodeValue = applyTextInterpolation(attribute.nodeValue, values);
                        }
                    }
                    break;

                case document.TEXT_NODE:
                    child.nodeValue = applyTextInterpolation(child.nodeValue, values);
                    break;
            }
        }
    }

    function render(el, config, data, context) {
        const {
            source,
            anchors = true,
            sectionPrelude,
            sectionPostlude,
            codeConfig
        } = config;
        const interpolations = new Map();
        let mdSource = typeof data === 'string' ? data : source || '';

        if (Array.isArray(mdSource)) {
            mdSource = mdSource.join('\n');
        }

        mdSource = mdSource.replace(/{{(.+?)}}/gs, (_, query) => {
            query = query.trim();

            if (!interpolations.has(query)) {
                interpolations.set(query, interpolations.size);
            }

            return `{{${interpolations.get(query)}}}`;
        });

        el.classList.add('view-markdown');

        return new Promise((resolve) => {
            marked(
                mdSource,
                { ...opts, anchors },
                (er, html) => {
                    const promises = [];

                    el.innerHTML = html;

                    // interpolations
                    if (interpolations.size > 0) {
                        const interpolationValues = new Array(interpolations.size);

                        for (const [query, index] of interpolations.entries()) {
                            try {
                                interpolationValues[index] = host.query(query, data, context);
                            } catch (e) {
                                host.log('error', 'Interpolation query error in markdown:', e);
                            }
                        }

                        applyInterpolations(el, interpolationValues);
                    }

                    // index sections if needed
                    const sectionByHeaderEl = new Map();
                    let startSectionKey = { after: buffer => el.prepend(buffer) };
                    if (codeConfig || sectionPrelude || sectionPostlude) {
                        const { firstElementChild } = el;
                        let prevSection = {
                            next: null,
                            data: {
                                sectionIdx: 0,
                                slug: null,
                                text: null,
                                href: null
                            }
                        };

                        sectionByHeaderEl.set(startSectionKey, prevSection);

                        for (const headerEl of [...el.querySelectorAll(':scope > :is(h1, h2, h3, h4, h5, h6)')]) {
                            if (headerEl === firstElementChild) {
                                sectionByHeaderEl.delete(startSectionKey);
                                startSectionKey = headerEl;
                                prevSection = null;
                            }

                            const anchorEl = headerEl.querySelector(':scope > a[id^="!anchor:"]');
                            const section = {
                                next: null,
                                data: {
                                    sectionIdx: sectionByHeaderEl.size,
                                    slug: headerEl.dataset.slug,
                                    text: headerEl.textContent.trim(),
                                    href: anchorEl?.hash
                                }
                            };

                            sectionByHeaderEl.set(headerEl, section);

                            if (prevSection) {
                                prevSection.next = headerEl;
                            }

                            prevSection = section;
                        }
                    }

                    // highlight code with a source view
                    for (const codeEl of [...el.querySelectorAll('pre > code')]) {
                        const buffer = document.createDocumentFragment();
                        const content = codeEl.textContent.replace(/\n$/, '');
                        const syntax = (codeEl.className.match(/discovery-markdown-(\S+)/) || [])[1];
                        let section = sectionByHeaderEl.get(startSectionKey);
                        let cursor = codeEl.parentNode;

                        while (cursor !== null && cursor !== el) {
                            if (sectionByHeaderEl.has(cursor)) {
                                section = sectionByHeaderEl.get(cursor);
                                break;
                            }

                            cursor = cursor.previousSibling || cursor.parentNode;
                        }

                        promises.push(
                            this.render(
                                buffer,
                                typeof codeConfig === 'object'
                                    ? { view: 'source', ...codeConfig }
                                    : codeConfig || 'source',
                                { syntax, content },
                                { ...context, section: section?.data }
                            ).then(() =>
                                codeEl.parentNode.replaceWith(buffer)
                            )
                        );
                    }

                    if (sectionPrelude || sectionPostlude) {
                        const renderSectionPrePost = (renderConfig, section, insertCallback) => {
                            const buffer = document.createDocumentFragment();
                            promises.push(
                                this.render(
                                    buffer,
                                    renderConfig,
                                    data,
                                    { ...context, section: section.data }
                                ).then(() => insertCallback(buffer))
                            );
                        };

                        for (const [sectionStartEl, section] of sectionByHeaderEl) {
                            if (sectionPrelude) {
                                renderSectionPrePost(sectionPrelude, section, buffer =>
                                    sectionStartEl.after(buffer)
                                );
                            }

                            if (sectionPostlude) {
                                renderSectionPrePost(sectionPostlude, section, buffer =>
                                    section.next ? section.next.before(buffer) : el.append(buffer)
                                );
                            }
                        }
                    }

                    Promise.all(promises).then(resolve);
                }
            );
        });
    }

    host.view.define('markdown', render, { usage });
    host.view.define('md', render, { usage });
}
