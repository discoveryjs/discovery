/* eslint-env browser */
import { marked } from 'marked';
import usage from './markdown.usage.js';
import { escapeHtml } from '../core/utils/html.js';

class CustomRenderer extends marked.Renderer {
    heading(text, level, raw, slugger) {
        const { discovery: host, anchors } = this.options;
        let anchor = '';

        if (anchors) {
            const slug = slugger.slug(raw);
            const href = host.encodePageHash(
                host.pageId,
                host.pageRef,
                { ...host.pageParams, '!anchor': slug }
            );

            anchor = `<a class="view-header__anchor" id="!anchor:${slug}" href="${href}"></a>`;
        }

        return `<h${level} class="view-header view-h${level}">${anchor}${text}</h${level}>\n`;
    }

    link(href, title, text) {
        if (href === null) {
            return text;
        }

        let out = '<a class="view-link" href="' + escapeHtml(href) + '"';

        if (title) {
            out += ' title="' + title + '"';
        }

        if (!href.startsWith('#')) {
            out += ' target="_blank"';
        }

        out += '>' + text + '</a>';

        return out;
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
        discovery: host,
        highlight: function(content, syntax, callback) {
            const buffer = document.createDocumentFragment();
            host.view.render(buffer, 'source', { syntax, content })
                .then(() => callback(null, buffer.firstChild.outerHTML));
        }
    };

    function render(el, config, data) {
        const { source, anchors = true } = config;

        el.classList.add('view-markdown');

        return new Promise((resolve) => {
            marked(
                typeof data === 'string' ? data : source || '',
                { ...opts, anchors },
                (er, html) => {
                    el.innerHTML = html.replace(/\n(<\/code>)/g, '$1'); // FIXME: marked adds extra newline before </code> for unknown reason
                    resolve();
                }
            );
        });
    }

    host.view.define('markdown', render, { usage });
    host.view.define('md', render, { usage });
}
