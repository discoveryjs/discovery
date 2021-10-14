/* eslint-env browser */

import hitext from 'hitext';
import CodeMirror from 'codemirror';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/css/css';
import 'codemirror/mode/xml/xml';
import { equal } from '../core/utils/compare';
import usage from './source.usage.js';

const maxSourceSizeToHighlight = 100 * 1024;
CodeMirror.modeToMime = {
    js: 'application/javascript',
    ts: 'application/typescript',
    typescript: 'application/typescript',
    json: 'application/json',
    html: 'text/html',
    css: 'text/css',
    scss: 'text/x-scss',
    less: 'text/x-less'
};

function getSupported() {
    const modes = new Set();
    const mimeMode = new Map();
    const resolveMode = ref => {
        const mode = CodeMirror.resolveMode(ref);
        const key = [...mimeMode.keys()].find(key => equal(key, mode));

        if (key) {
            return key;
        }

        mimeMode.set(mode, {
            name: new Set(),
            mime: new Set()
        });

        return mode;
    };

    for (const [alias, mime] of Object.entries(CodeMirror.modeToMime)) {
        const mode = mimeMode.get(resolveMode(mime));

        mode.mime.add(mime);
        mode.name.add(alias);
        modes.add(alias);
    }

    for (const [mime, alias] of Object.entries(CodeMirror.mimeModes)) {
        const mode = mimeMode.get(resolveMode(mime));

        mode.mime.add(mime);
        if (typeof alias === 'string') {
            mode.name.add(alias);
            modes.add(alias);
        }
    }

    for (const [alias] of Object.entries(CodeMirror.modes)) {
        if (!modes.has(alias)) {
            const mode = CodeMirror.modes[alias];

            if (!mimeMode.has(mode)) {
                mimeMode.set(mode, {
                    name: new Set(),
                    mime: []
                });
            }

            mimeMode.get(mode).name.add(alias);
        }
    }

    return [...mimeMode.values()].map(syntax => ({
        name: [...syntax.name],
        mime: [...syntax.mime]
    }));
}

function codeMirrorHighlight(modespec, host) {
    const mode = CodeMirror.getMode(CodeMirror.defaults, {
        name: CodeMirror.modeToMime[modespec] || modespec,
        isDiscoveryViewDefined: name => host.view.isDefined(name)
    });

    return (source, createRange) => {
        const state = CodeMirror.startState(mode);
        const lines = source.split(/(\n|\r\n?)/);
        let lineOffset = 0;

        for (let i = 0; i < lines.length; i++) {
            if (i % 2 === 0) {
                const stream = new CodeMirror.StringStream(lines[i], 4, {
                    lookAhead: n => lines[i + n],
                    baseToken: function() {}
                });

                while (!stream.eol()) {
                    const style = mode.token(stream, state);

                    if (style) {
                        createRange(lineOffset + stream.start, lineOffset + stream.pos, style);
                    }

                    stream.start = stream.pos;
                }
            }

            lineOffset += lines[i].length;
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

export default function(host) {
    host.view.define('source', function(el, config, data) {
        const decorators = [];
        const {
            mime, // deprecated, syntax = name or mime
            binary,
            size,
            syntax,
            lineNum = true,
            content,
            refs,
            error,
            disabled
        } = data;

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
            decorators.push([codeMirrorHighlight(syntax || mime, host), {
                html: {
                    open({ data: type }) {
                        return '<span class="token ' + type + '">';
                    },
                    close() {
                        return '</span>';
                    }
                }
            }]);
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
            const lineOffset = typeof lineNum === 'function' ? lineNum : idx => idx + 1;
            const lines = lineNum
                ? '<div class="lines">' +
                    content.split(/\r\n?|\n/g)
                        .map((_, idx) => '<span>' + lineOffset(idx) + '</span>')
                        .join('') +
                  '</div>'
                : '';
            el.innerHTML =
                lines +
                '<div>' +
                    hitext(decorators, 'html')(content) +
                '</div>';
        }
    }, {
        usage,
        get syntaxes() {
            return getSupported();
        }
    });
}
