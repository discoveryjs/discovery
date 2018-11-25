/* eslint-env browser */

import hitext from '/gen/hitext.js';
import hitextPrismjs from '/gen/hitext-prismjs.js';

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

const printer = hitext.printer.html
    .fork(hitextPrismjs.printer.html)
    .fork({
        hooks: Object.assign({}, hitext.printer.html.hooks, {
            error: {
                open() {
                    return '<span class="spotlight spotlight-error">';
                },
                close() {
                    return '</span>';
                }
            },
            link: {
                open(href) {
                    return '<a href="#' + href + '" class="spotlight">';
                },
                close() {
                    return '</a>';
                }
            },
            ignore: {
                open() {
                    return '<span class="spotlight spotlight-ignore">';
                },
                close() {
                    return '</span>';
                }
            }
        })
    });

export default function(discovery) {
    discovery.view.define('source', function(el, config, data) {
        const { mime, binary, size, content, error, disabled } = data;
        let { syntax, refs } = data;

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

        if (!syntax && mime in mimeToSyntax) {
            syntax = mimeToSyntax[mime];
        }

        if (!Array.isArray(refs)) {
            refs = [];
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
                    [
                        (source, addRange) => {
                            if (syntax) {
                                hitextPrismjs(syntax || 'extend')(source, addRange);
                            }
                        },
                        (source, addRange) =>
                            refs.forEach(ref => {
                                if (ref.range) {
                                    addRange(
                                        ref.ignore || !ref.resolved ? 'ignore' : ref.broken ? 'error' : 'link',
                                        ref.range[0],
                                        ref.range[1],
                                        'file:' + ref.resolved // FIXME: should not use a view reference here
                                    );
                                }
                            })
                    ],
                    printer
                );
        }
    });
}
