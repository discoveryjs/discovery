/* eslint-env browser */

import hitext from 'hitext';
import CodeMirror from 'codemirror';
import 'codemirror/mode/javascript/javascript.js';
import 'codemirror/mode/css/css.js';
import 'codemirror/mode/xml/xml.js';
import { escapeHtml } from '../../core/utils/html.js';
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
    const resolvedClassName = Array.isArray(customClassName)
        ? customClassName.join(' ')
        : (typeof customClassName === 'string' ? customClassName : false);
    const classNames = defaultClassNames && resolvedClassName
        ? [defaultClassNames, resolvedClassName].join(' ')
        : defaultClassNames || resolvedClassName || '';

    return classNames ? ` class="${classNames}"` : '';
}

function refAttrs(data, defaultClassName = 'spotlight') {
    return `${
        classNames(data, defaultClassName)
    }${
        data.marker ? ` data-marker="${data.marker}"` : ''
    }${
        typeof data.tooltipId === 'number' ? ` data-tooltip-id="${data.tooltipId}"` : ''
    }`;
}

function markAttrs(data, defaultClassName = 'mark') {
    const prefix = data.prefix ?? (['self', 'nested', 'total'].includes(data.kind) ? data.kind[0].toUpperCase() : undefined);
    const postfix = data.postfix ?? undefined;

    return refAttrs(data, defaultClassName) + ` data-render-id=${data.renderId}${
        data.kind ? ` data-kind="${data.kind}"` : ''
    }${
        prefix !== undefined ? ` data-prefix="${escapeHtml(prefix)}"` : ''
    }${
        postfix !== undefined ? ` data-postfix="${escapeHtml(postfix)}"` : ''
    }`;
}

const refsPrinter = {
    html: {
        open({ data }) {
            switch (data.type) {
                case 'link':
                    return `<a href=${JSON.stringify(data.href)}${refAttrs(data, 'spotlight')}>`;
                case 'span':
                case 'spotlight':
                    return `<span${refAttrs(data, 'spotlight')}>`;
            }
        },
        close({ data }) {
            switch (data.type) {
                case 'link':
                    return '</a>';
                case 'span':
                case 'spotlight':
                    return '</span>';
            }
        }
    }
};
const marksPrinter = {
    html: {
        open({ data }) {
            switch (data.type) {
                case 'link':
                    return `<a href=${JSON.stringify(data.href)}${markAttrs(data, 'mark')}>`;
                case 'span':
                    return `<span${markAttrs(data, 'mark')}>`;
            }
        },
        close({ data }) {
            switch (data.type) {
                case 'link':
                    return '</a>';
                case 'span':
                    return '</span>';
            }
        }
    }
};

const props = `is not array? | {
    source: #.props has no 'source' ? is string ?: content is string ? content : source,
    syntax,
    lineNum is function ?: is not undefined ? bool() : true,
    ranges: #.props.refs or refs | is array ?: undefined,
    marks is array ?: null,
    maxSourceSizeToHighlight is number ?: 250 * 1024, // 250Kb
    actionButtons: undefined,
    actionCopySource is undefined ? true,
    prelude: undefined,
    postlude: undefined
} | overrideProps()`;

export default function(host) {
    host.view.define('source', async function(el, props, data, context) {
        const preludeEl = el.appendChild(createElement('div', 'view-source__prelude'));
        const contentEl = el.appendChild(createElement('div', 'view-source__content'));
        const postludeEl = el.appendChild(createElement('div', 'view-source__postlude'));
        const viewTooltips = new Map();
        const markContentRenders = new Map();
        const markRenders = [];
        const decorators = [];
        const {
            source,
            syntax,
            lineNum = true,
            ranges,
            marks,
            maxSourceSizeToHighlight,
            actionButtons,
            actionCopySource,
            prelude,
            postlude
        } = props;
        const nestedViewRenderData = typeof data === 'string' ? { source: data } : data;
        const nestedViewRenderContext = {
            ...context,
            sourceViewProps: {
                source,
                syntax,
                lineNum,
                ranges,
                marks,
                maxSourceSizeToHighlight
            }
        };

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

        if (Array.isArray(ranges)) {
            decorators.push([
                (_, createRange) => ranges.forEach(ref => {
                    if (!ref || typeof ref !== 'object') {
                        host.logger.warn('Bad value for an entry in "source" view props.ranges, must be an object', { props, entry: ref });
                        return;
                    }

                    const refType = ref.type
                        ? (ref.type === 'spotlight' ? 'span' : ref.type)
                        : (ref.href ? 'link' : 'span');
                    const refRange = ref.range;
                    let tooltipId = undefined;

                    if (!['link', 'span'].includes(refType)) {
                        host.logger.warn(`Bad type "${refType}" of an entry in "source" view props.ranges`, { props, ref });
                        return;
                    }

                    if (!refRange) {
                        host.logger.warn('Missed range for an entry in "source" view props.ranges', { props, entry: ref });
                        return;
                    }

                    if (ref.tooltip) {
                        viewTooltips.set(tooltipId = viewTooltips.size, ref);
                    }

                    createRange(
                        ref.range[0],
                        ref.range[1],
                        { ...ref, type: refType, tooltipId }
                    );
                }),
                refsPrinter
            ]);
        }

        if (Array.isArray(marks)) {
            decorators.push([
                (_, createRange) => marks.forEach(mark => {
                    if (!mark || typeof mark !== 'object') {
                        host.logger.warn('Bad value for an entry in "source" view props.mark, must be an object', { props, mark });
                        return;
                    }

                    const markKind = !mark.content
                        ? 'dot'
                        : !mark.kind || ['dot', 'self', 'nested', 'total', 'none'].includes(mark.kind)
                            ? mark.kind || 'span'
                            : undefined;
                    const markOffset = typeof mark.offset === 'number' && isFinite(mark.offset)
                        ? Math.max(0, Math.round(mark.offset))
                        : undefined;
                    let tooltipId = undefined;

                    if (typeof markKind !== 'string') {
                        host.logger.warn('Bad "kind" value for an entry in "source" view props.marks', { props, mark });
                        return;
                    }

                    if (typeof markOffset !== 'number') {
                        host.logger.warn('Bad "offset" value for an entry in "source" view props.marks', { props, mark });
                        return;
                    }

                    if (mark.tooltip) {
                        viewTooltips.set(tooltipId = viewTooltips.size, mark);
                    }

                    const markConfig = {
                        ...mark,
                        type: typeof mark.href === 'string' ? 'link' : 'span',
                        kind: markKind,
                        renderId: markContentRenders.size,
                        tooltipId
                    };

                    markContentRenders.set(markConfig.renderId, markConfig);
                    createRange(markOffset, markOffset, markConfig);
                }),
                marksPrinter
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

        if (markContentRenders.size) {
            for (const markEl of contentEl.querySelectorAll('.mark[data-render-id]')) {
                const markConfig = markContentRenders.get(Number(markEl.dataset.renderId));

                if (markConfig.content) {
                    markRenders.push(this.render(markEl, markConfig.content, markConfig, nestedViewRenderContext));
                }
            }
        }

        // action buttons
        const actionButtonsEl = createElement('div', 'view-source__action-buttons');
        const actionCopyFn = actionCopySource !== true
            ? (typeof actionCopySource === 'function' ? actionCopySource : null)
            : ({ source }) => source;
        const actionCopyButton = typeof actionCopyFn === 'function'
            ? {
                view: 'button',
                className: 'copy',
                content: [],
                async onClick(btnEl) {
                    clearTimeout(btnEl.copiedTimer);
                    await copyText(String(actionCopyFn(nestedViewRenderContext.sourceViewProps)));
                    btnEl.classList.add('copied');
                    btnEl.copiedTimer = setTimeout(() => btnEl.classList.remove('copied'), 1250);
                }
            }
            : null;

        contentEl.prepend(actionButtonsEl);
        await host.view.render(actionButtonsEl, [
            actionButtons,
            actionCopyButton
        ], nestedViewRenderData, nestedViewRenderContext);

        // tooltips
        for (const refEl of contentEl.querySelectorAll(':scope [data-tooltip-id]')) {
            const ref = viewTooltips.get(Number(refEl.dataset.tooltipId));

            delete refEl.dataset.tooltipId;
            this.tooltip(refEl, ref.tooltip, ref, context);
        }

        if (prelude) {
            await host.view.render(preludeEl, prelude, nestedViewRenderData, nestedViewRenderContext);
        }

        if (postlude) {
            await host.view.render(postludeEl, postlude, nestedViewRenderData, nestedViewRenderContext);
        }

        if (markRenders.length) {
            await Promise.all(markRenders);
        }
    }, {
        props,
        usage,
        tag: 'pre'
    });
}
