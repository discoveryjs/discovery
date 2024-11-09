/* eslint-env browser */
import { Marked, Renderer } from 'marked';
import { slug as generateSlug } from 'github-slugger';
import usage from './markdown.usage.js';
import { escapeHtml } from '../../core/utils/html.js';

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

class CustomRenderer extends Renderer {
    heading({ tokens, depth, text }) {
        const { discoveryjs: { host, useAnchors } } = this.options;
        const slug = generateSlug(text);
        let anchor = '';

        if (useAnchors) {
            const href = host.encodePageHash(
                host.pageId,
                host.pageRef,
                { ...host.pageParams, '!anchor': slug }
            );

            anchor = `<a class="view-header__anchor" id="!anchor:${escapeHtml(slug)}" href="${href}"></a>`;
        }

        return `<h${depth} class="view-header view-h${depth}" data-slug="${slug}">${anchor}${
            this.parser.parseInline(tokens)
        }</h${depth}>\n`;
    }

    code({ text: source, lang: syntax }) {
        const { discoveryjs: { codes } } = this.options;
        const id = codes.push({
            syntax,
            source
        }) - 1;

        return `<code class="discoveryjs-code" data-id="${id}"></code>`;
    }

    link({ tokens, href, title }) {
        const text = this.parser.parseInline(tokens);

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

    checkbox({ checked }) {
        return (
            '<label class="view-checkbox"><input type="checkbox" disabled' +
            (checked ? ' checked' : '') +
            '/></label> '
        );
    }

    list({ items, ordered, start }) {
        const tag = ordered ? 'ol' : 'ul';
        const startAttr = ordered && start !== 1 ? ` start="${start}"` : '';

        return (
            `<${tag} class="view-${tag}"${startAttr}>\n` +
            items.map(this.listitem, this).join('\n') +
            `\n</${tag}>\n`
        );
    }
    listitem(token) {
        let prefix = '';

        if (token.task) {
            const checkbox = this.checkbox({ checked: Boolean(token.checked) });

            if (token.loose) {
                const firstToken = item.tokens[0];

                if (firstToken?.type === 'paragraph') {
                    firstToken.text = checkbox + firstToken.text;
                    if (Array.isArray(firstToken.tokens) && firstToken.tokens[0]?.type === 'text') {
                        firstToken.tokens[0].text = checkbox + firstToken.tokens[0].text;
                    }
                } else {
                    token.tokens.unshift({
                        type: 'text',
                        raw: checkbox,
                        text: checkbox
                    });
                }
            } else {
                prefix += checkbox;
            }
        }

        return `<li class="view-list-item${token.task ? ' check-list-item' : ''}">${prefix}${
            this.parser.parse(token.tokens, Boolean(token.loose))
        }</li>\n`;
    }

    table({ header, rows }) {
        const body = rows.map(row =>
            '<tr class="view-table-row">' + row.map(this.tablecell, this).join('') + '</tr>'
        ).join('\n');

        return (
            '<table class="view-table">\n' +
            '<thead>\n' +
            header.map(this.tablecell, this).join('') +
            '\n</thead>\n' +
            (body ? '<tbody>\n' + body + '\n</tbody>\n' : '') +
            '</table>\n'
        );
    }

    tablecell({ tokens, header, align }) {
        const type = header ? 'th' : 'td';

        return (
            `<${type} class="view-table-cell"${align ? ` align="${align}"` : ''}>` +
            this.parser.parseInline(tokens) +
            `</${type}>\n`
        );
    }
}

const props = `is not array? | {
    source: #.props has no 'source' ? is string ?,
    anchors: true,
    sectionPrelude: undefined,
    sectionPostlude: undefined,
    codeConfig: undefined
} | overrideProps()`;

export default function(host) {
    const marked = new Marked().setOptions({
        smartLists: true,
        renderer: new CustomRenderer()
    });

    function render(el, config, data, context) {
        const interpolations = new Map();
        const codes = [];
        const {
            source,
            anchors = true,
            sectionPrelude,
            sectionPostlude,
            codeConfig
        } = config;
        let mdSource = source;

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

        const html = marked.parse(mdSource, { discoveryjs: { host, useAnchors: anchors, codes } });
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
        for (const codeEl of [...el.querySelectorAll('.discoveryjs-code')]) {
            const buffer = document.createDocumentFragment();
            const id = codeEl.dataset.id;
            const { syntax, source } = codes[id];
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
                    { syntax, source },
                    { ...context, section: section?.data }
                ).then(() =>
                    codeEl.replaceWith(buffer)
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

        return Promise.all(promises);
    }

    host.view.define('markdown', render, { props, usage });
    host.view.define('md', render, { props, usage });
}
