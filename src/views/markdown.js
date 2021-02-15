/* eslint-env browser */
import marked from 'marked';
import usage from './markdown.usage.js';
import { escapeHtml } from '../core/utils/html.js';

class CustomRenderer extends marked.Renderer {
    heading(text, level, raw, slugger) {
        let id = '';

        if (this.options.headerIds) {
            id = ' id="' + this.options.headerPrefix + slugger.slug(raw) + '"';
        }

        return `<h${level} class="view-header view-h${level}"${id}>${text}</h${level}>\n`;
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
        const tag = flags.align
            ? '<' + type + ' align="' + flags.align + '" class="view-table-cell">'
            : '<' + type + '>';
        return tag + content + '</' + type + '>\n';
    }
}

marked.setOptions({
    smartLists: true,
    langPrefix: 'discovery-markdown-',
    renderer: new CustomRenderer()
});

export default function(discovery) {
    const opts = {
        highlight: function(content, syntax, callback) {
            const buffer = document.createDocumentFragment();
            discovery.view.render(buffer, 'source', { syntax, content })
                .then(() => callback(null, buffer.firstChild.outerHTML));
        }
    };

    function render(el, config, data) {
        const { source } = config;

        el.classList.add('view-markdown');

        return new Promise((resolve) => {
            marked(
                typeof data === 'string' ? data : source || '',
                opts,
                (er, html) => {
                    el.innerHTML = html.replace(/\n(<\/code>)/g, '$1'); // FIXME: marked adds extra newline before </code> for unknown reason
                    resolve();
                }
            );
        });
    }

    discovery.view.define('markdown', render, { usage });
    discovery.view.define('md', render, { usage });
}
