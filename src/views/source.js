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
    const mimeMode = new Map();
    const resolveMode = ref => {
        const mode = CodeMirror.resolveMode(ref);
        const key = [...mimeMode.keys()].find(key => equal(key, mode));

        if (key) {
            return key;
        }

        mimeMode.set(mode, {
            mime: new Set(),
            name: new Set()
        });

        return mode;
    };

    for (const [alias, mime] of Object.entries(CodeMirror.modeToMime)) {
        const mode = mimeMode.get(resolveMode(mime));

        mode.mime.add(mime);
        mode.name.add(alias);
    }

    for (const [mime, alias] of Object.entries(CodeMirror.mimeModes)) {
        const mode = mimeMode.get(resolveMode(mime));

        mode.mime.add(mime);
        if (typeof alias === 'string') {
            mode.name.add(alias);
        }
    }

    return [...mimeMode.values()].map(syntax => ({
        name: [...syntax.name],
        mime: [...syntax.mime]
    }));
}

function codeMirrorHighlight(modespec, discovery) {
    const mode = CodeMirror.getMode(CodeMirror.defaults, {
        name: CodeMirror.modeToMime[modespec] || modespec,
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
        const {
            mime, // deprecated, syntax = name or mime
            binary,
            size,
            syntax,
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
            decorators.push([codeMirrorHighlight(syntax || mime, discovery), {
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
    }, {
        usage,
        get syntaxes() {
            return getSupported();
        }
    });
}
