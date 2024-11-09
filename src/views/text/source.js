/* eslint-env browser */

import hitext from 'hitext';
import CodeMirror from 'codemirror';
import 'codemirror/mode/javascript/javascript.js';
import 'codemirror/mode/css/css.js';
import 'codemirror/mode/xml/xml.js';
import { createElement } from '../../core/utils/dom.js';
import { copyText } from '../../core/utils/copy-text.js';
import usage from './source.usage.js';

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

const props = `is not array? | {
    source: #.props has no 'source' ? is string ?: content is string ? content : source,
    syntax,
    lineNum is function ?: is not undefined ? bool() : true,
    refs is array ?: null,
    maxSourceSizeToHighlight is number ?: 250 * 1024, // 250Kb
    actionButtons: undefined,
    prelude: undefined,
    postlude: undefined
} | overrideProps()`;

export default function(host) {
    host.view.define('source', async function(el, props, data, context) {
        const preludeEl = el.appendChild(createElement('div', 'view-source__prelude'));
        const contentEl = el.appendChild(createElement('div', 'view-source__content'));
        const postludeEl = el.appendChild(createElement('div', 'view-source__postlude'));
        const refsTooltips = new Map();
        const decorators = [];
        const {
            source,
            syntax,
            lineNum = true,
            refs,
            maxSourceSizeToHighlight,
            actionButtons,
            prelude,
            postlude
        } = props;

        if (typeof source !== 'string') {
            return;
        }

        // prevent syntax highlighting for sources over maxSourceSizeToHighlight to avoid page freeze
        if (source.length < maxSourceSizeToHighlight) {
            decorators.push([codeMirrorHighlight(syntax, host), {
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

        const lineOffset = typeof lineNum === 'function' ? lineNum : idx => idx + 1;
        const lines = lineNum
            ? '<div class="view-source__lines">' +
                source.split(/\r\n?|\n/g)
                    .map((_, idx) => '<span>' + lineOffset(idx) + '</span>')
                    .join('') +
                '</div>'
            : '';

        // main content
        contentEl.innerHTML =
            lines +
            `<div class="view-source__source">${
                hitext(decorators, 'html')(source)
            }</div>`;

        // action buttons
        const actionButtonsEl = createElement('div', 'view-source__action-buttons');

        contentEl.prepend(actionButtonsEl);
        await host.view.render(actionButtonsEl, [
            actionButtons,
            { view: 'button', className: 'copy', async onClick(btnEl) {
                clearTimeout(btnEl.copiedTimer);
                await copyText(source);
                btnEl.classList.add('copied');
                btnEl.copiedTimer = setTimeout(() => btnEl.classList.remove('copied'), 1250);
            } }
        ], data, context);

        // tooltips
        for (const refEl of contentEl.querySelectorAll(':scope [data-tooltip-id]')) {
            const ref = refsTooltips.get(Number(refEl.dataset.tooltipId));

            delete refEl.dataset.tooltipId;
            this.tooltip(refEl, ref.tooltip, ref, context);
        }

        if (prelude) {
            await host.view.render(preludeEl, prelude, data, context);
        }

        if (postlude) {
            await host.view.render(postludeEl, postlude, data, context);
        }
    }, {
        props,
        usage,
        tag: 'pre'
    });
}
