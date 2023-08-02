/* eslint-env browser */

import hitext from 'hitext';
import CodeMirror from 'codemirror';
import 'codemirror/mode/javascript/javascript.js';
import 'codemirror/mode/css/css.js';
import 'codemirror/mode/xml/xml.js';
import { equal } from '../../core/utils/compare.js';
import { createElement } from '../../core/utils/dom.js';
import copyText from '../../core/utils/copy-text.js';
import usage from './source.usage.js';

const defaultMaxSourceSizeToHighlight = 250 * 1024;
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

function refAttrs(data) {
    return `${
        classNames(data, 'spotlight')
    }${
        data.marker ? ` data-marker="${data.marker}"` : ''
    }${
        typeof data.tooltipId === 'number' ? ` data-tooltip-id="${data.tooltipId}"` : ''
    }`;
}

const refsPrinter = {
    html: {
        open({ data }) {
            switch (data.type) {
                case 'link':
                    return `<a href="${data.href}"${refAttrs(data)}>`;
                case 'spotlight':
                    return `<span${refAttrs(data)}>`;
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
    host.view.define('source', function(el, config, data, context) {
        const preludeEl = el.appendChild(createElement('div', 'view-source__prelude'));
        const contentEl = el.appendChild(createElement('div', 'view-source__content'));
        const postludeEl = el.appendChild(createElement('div', 'view-source__postlude'));
        const refsTooltips = new Map();
        const decorators = [];
        const {
            mime, // deprecated, syntax = name or mime
            binary,
            size,
            maxSourceSizeToHighlight = defaultMaxSourceSizeToHighlight,
            syntax,
            lineNum = true,
            content,
            refs
        } = data;

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
                        let tooltipId = undefined;

                        if (ref.tooltip) {
                            refsTooltips.set(tooltipId = refsTooltips.size, ref);
                        }

                        createRange(
                            ref.range[0],
                            ref.range[1],
                            { type: 'spotlight', ...ref, tooltipId }
                        );
                    }
                }),
                refsPrinter
            ]);
        }

        if (binary) {
            contentEl.innerHTML = 'Binary content' + (typeof size === 'number' ? ' (' + size + ' bytes)' : '');
        } else {
            const lineOffset = typeof lineNum === 'function' ? lineNum : idx => idx + 1;
            const lines = lineNum
                ? '<div class="view-source__lines">' +
                    content.split(/\r\n?|\n/g)
                        .map((_, idx) => '<span>' + lineOffset(idx) + '</span>')
                        .join('') +
                  '</div>'
                : '';

            // main content
            contentEl.innerHTML =
                lines +
                `<div class="view-source__source">${
                    hitext(decorators, 'html')(content)
                }</div>`;

            // action buttons
            const actionButtonsEl = createElement('div', 'view-source__action-buttons');

            host.view.render(actionButtonsEl, [
                config.actionButtons,
                { view: 'button', className: 'copy', async onClick(btnEl) {
                    clearTimeout(btnEl.copiedTimer);
                    await copyText(content);
                    btnEl.classList.add('copied');
                    btnEl.copiedTimer = setTimeout(() => btnEl.classList.remove('copied'), 1250);
                } }
            ], data, context);
            contentEl.prepend(actionButtonsEl);

            // tooltips
            for (const refEl of contentEl.querySelectorAll(':scope [data-tooltip-id]')) {
                const ref = refsTooltips.get(Number(refEl.dataset.tooltipId));

                delete refEl.dataset.tooltipId;
                this.tooltip(refEl, ref.tooltip, ref, context);
            }

            if (config.prelude) {
                host.view.render(preludeEl, config.prelude, data, context);
            }

            if (config.postlude) {
                host.view.render(postludeEl, config.postlude, data, context);
            }
        }
    }, {
        usage,
        tag: 'pre',
        get syntaxes() {
            return getSupported();
        }
    });
}
