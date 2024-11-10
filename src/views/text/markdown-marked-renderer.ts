import type { ViewModel } from '../../main';
import { Renderer, type Tokens, type MarkedOptions } from 'marked';
import { slug as generateSlug } from 'github-slugger';
import { escapeHtml } from '../../core/utils/html.js';

export class CustomMarkedRenderer extends Renderer {
    declare options: MarkedOptions & {
        discoveryjs: {
            host: ViewModel,
            useAnchors: boolean,
            codes: Array<{
                syntax: string | undefined;
                source: string;
            }>
        }
    };

    heading({ tokens, depth, text }: Tokens.Heading) {
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

    code({ text: source, lang: syntax }: Tokens.Code) {
        const { discoveryjs: { codes } } = this.options;
        const id = codes.push({
            syntax,
            source
        }) - 1;

        return `<code class="discoveryjs-code" data-id="${id}"></code>`;
    }

    link({ tokens, href, title }: Tokens.Link) {
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

    checkbox({ checked }: { checked: boolean }) {
        return (
            '<label class="view-checkbox"><input type="checkbox" disabled' +
            (checked ? ' checked' : '') +
            '/></label> '
        );
    }

    list({ items, ordered, start }: Tokens.List) {
        const tag = ordered ? 'ol' : 'ul';
        const startAttr = ordered && start !== 1 ? ` start="${start}"` : '';

        return (
            `<${tag} class="view-${tag}"${startAttr}>\n` +
            items.map(this.listitem, this).join('\n') +
            `\n</${tag}>\n`
        );
    }
    listitem(token: Tokens.ListItem) {
        let prefix = '';

        if (token.task) {
            const checkbox = this.checkbox({ checked: Boolean(token.checked) });

            if (token.loose) {
                const firstToken = token.tokens[0];

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

    table({ header, rows }: Tokens.Table) {
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

    tablecell({ tokens, header, align }: Tokens.TableCell) {
        const type = header ? 'th' : 'td';

        return (
            `<${type} class="view-table-cell"${align ? ` align="${align}"` : ''}>` +
            this.parser.parseInline(tokens) +
            `</${type}>\n`
        );
    }
}
