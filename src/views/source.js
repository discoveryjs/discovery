/* eslint-env browser */

import hitext from '/gen/hitext.js';
import hitextPrismjs from '/gen/hitext-prismjs.js';
import CodeMirror from '/gen/codemirror.js';

const maxSourceSizeToHighlight = 100 * 1024;
const mimeToSyntax = new Map(Object.entries({
    'application/javascript': 'javascript',
    'application/x-httpd-php': 'php',
    'application/xml': 'xml',
    'application/json': 'json',
    'text/html': 'html',
    'text/css': 'css',
    'text/stylus': 'stylus',
    'text/yaml': 'yaml',
    'image/svg+xml': 'svg'
}));

function codeMirrorHighlight(modespec, discovery) {
    const mode = CodeMirror.getMode(CodeMirror.defaults, {
        name: modespec,
        isDiscoveryViewDefined: name => discovery.view.isDefined(name)
    });

    return (source, createRange) => {
        const stream = new CodeMirror.StringStream(source, null);
        const state = CodeMirror.startState(mode);

        while (!stream.eol()) {
            const style = mode.token(stream, state);

            if (style) {
                createRange(stream.start, stream.pos, style);
            }

            stream.start = stream.pos;
        }
    };
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

const refsPrinter = {
    html: {
        open({ data }) {
            switch (data.type) {
                case 'link':
                    return `<a href="${data.href}"${classNames(data)}${data.marker ? ` data-marker="${data.marker}"` : ''}>`;
                case 'spotlight':
                    return `<span ${classNames(data, 'spotlight')}${data.marker ? ` data-marker="${data.marker}"` : ''}>`;
            }
        },
        close({ data }) {
            switch (data.type) {
                case 'link':
                    return '</a>';
                case 'spotlight':
                    return '</span>';
            }
        }
    }
};

export default function(discovery) {
    discovery.view.define('source', function(el, config, data) {
        const decorators = [];
        const { mime, binary, size, syntax, content, refs, error, disabled } = data;

        if (disabled) {
            el.classList.add('disabled');
            el.textContent = error;
            return;
        }

        if (error) {
            el.classList.add('error');
            el.textContent = error;
            return;
        }

        if (typeof content !== 'string') {
            return;
        }

        // prevent syntax highlighting for sources over maxSourceSizeToHighlight to avoid page freeze
        if (content.length < maxSourceSizeToHighlight) {
            let highlightSyntax = syntax || mimeToSyntax.get(mime);

            if (highlightSyntax) {
                decorators.push(
                    highlightSyntax === 'discovery-view' || highlightSyntax === 'discovery-query'
                        ? [codeMirrorHighlight(highlightSyntax, discovery), {
                            html: {
                                open({ data: type }) {
                                    return '<span class="token ' + type + '">';
                                },
                                close() {
                                    return '</span>';
                                }
                            }
                        }]
                        : hitextPrismjs(highlightSyntax)
                );
            }
        }

        if (Array.isArray(refs)) {
            decorators.push([
                (_, createRange) => refs.forEach(ref => {
                    if (ref.range) {
                        createRange(
                            ref.range[0],
                            ref.range[1],
                            { type: 'spotlight', ...ref }
                        );
                    }
                }),
                refsPrinter
            ]);
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
                '<div>' +
                    hitext(decorators, 'html')(content) +
                '</div>';
        }
    });
}
