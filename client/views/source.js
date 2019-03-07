/* eslint-env browser */

import hitext from '/gen/hitext.js';
import hitextPrismjs from '/gen/hitext-prismjs.js';

const maxSourceSizeToHighlight = 100 * 1024;
const mimeToSyntax = {
    'application/javascript': 'javascript',
    'application/x-httpd-php': 'php',
    'application/xml': 'xml',
    'application/json': 'json',
    'text/html': 'html',
    'text/css': 'css',
    'text/stylus': 'stylus',
    'text/yaml': 'yaml',
    'image/svg+xml': 'svg'
};

function classNames(options, defaultClassNames) {
    const customClassName = options && options.className;
    const classNames = [
        defaultClassNames,
        Array.isArray(customClassName)
            ? customClassName.join(' ')
            : (typeof customClassName === 'string' ? customClassName : false)
    ].filter(Boolean).join(' ');

    return classNames ? ` class="${classNames}"` : '';
}

const printer = hitext.printer.html
    .fork(hitextPrismjs.printer.html)
    .fork({
        hooks: {
            ...hitext.printer.html.hooks,
            link: {
                open(options) {
                    return `<a href="${options.href}"${classNames(options)}${options.marker ? ` data-marker="${options.marker}"` : ''}>`;
                },
                close() {
                    return '</a>';
                }
            },

            spotlight: {
                open(options) {
                    return `<span ${classNames(options, 'spotlight')}${options.marker ? ` data-marker="${options.marker}"` : ''}>`;
                },
                close() {
                    return '</span>';
                }
            }
        }
    });

export default function(discovery) {
    discovery.view.define('source', function(el, config, data) {
        const decorators = [];
        const { mime, binary, size, syntax, content, refs, error, disabled } = data;

        if (disabled) {
            el.classList.add('disabled');
            el.innerText = error;
            return;
        }

        if (error) {
            el.classList.add('error');
            el.innerText = error;
            return;
        }

        // prevent syntax highlighting for sources over maxSourceSizeToHighlight to avoid page freeze
        if (content.length < maxSourceSizeToHighlight && (syntax || mimeToSyntax.hasOwnProperty(mime))) {
            decorators.push((source, addRange) => {
                hitextPrismjs(syntax || mimeToSyntax[mime])(source, addRange);
            });
        }

        if (Array.isArray(refs)) {
            decorators.push((source, addRange) =>
                refs.forEach(ref => {
                    if (ref.range) {
                        addRange(
                            ref.type || 'spotlight',
                            ref.range[0],
                            ref.range[1],
                            ref
                        );
                    }
                })
            );
        }

        if (binary) {
            el.innerHTML = 'Binary content' + (typeof size === 'number' ? ' (' + size + ' bytes)' : '');
        } else {
            el.innerHTML =
                '<div class="lines">' +
                    content.split(/\r\n?|\n/g)
                        .map((_, idx) => '<span>' + (idx + 1) + '</span>')
                        .join('') +
                '</div>' +
                hitext.decorate(
                    content,
                    decorators,
                    printer
                );
        }
    });
}
