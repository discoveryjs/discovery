const props = `is not array? | {
    source: #.props has no 'source' ? is string ?: content is string ? content : source,
    syntax,
    lineNum is function ?: is not undefined ? bool() : true,
    marks is array ?: null
} | overrideProps()`;

export default function(host) {
    host.textView.define('source', async function(node, props, data, context) {
        const markContentRenders = new Map();
        const markRenders = [];
        const {
            source,
            syntax,
            lineNum = true,
            marks
        } = props;
        const nestedViewRenderContext = {
            ...context,
            sourceViewProps: {
                source,
                syntax,
                lineNum,
                marks
            }
        };

        if (typeof source !== 'string') {
            return;
        }

        const lineOffset = typeof lineNum === 'function' ? lineNum : idx => idx + 1;
        const lineNums = lineNum
            ? source.split(/\r\n?|\n/g).map((_, idx) => String(lineOffset(idx)))
            : [];

        if (lineNums.length > 2) {
            const width = lineNums.reduce((max, lineNum) => Math.max(max, lineNum.length), 3);

            for (let i = 0; i < lineNums.length; i++) {
                if (lineNums[i].length < width) {
                    lineNums[i] = lineNums[i].padStart(width);
                }
            }
        }

        node.appendText(`\n\`\`\`${syntax || ''}\n`);
        node.appendText(renderLineNum());

        if (Array.isArray(marks)) {
            for (const mark of marks) {
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

                if (typeof markKind !== 'string') {
                    host.logger.warn('Bad "kind" value for an entry in "source" view props.marks', { props, mark });
                    return;
                }

                if (typeof markOffset !== 'number') {
                    host.logger.warn('Bad "offset" value for an entry in "source" view props.marks', { props, mark });
                    return;
                }

                markRenders.push({
                    ...mark,
                    offset: Math.max(0, Math.min(markOffset, source.length)),
                    type: typeof mark.href === 'string' ? 'link' : 'span',
                    kind: markKind,
                    renderId: markContentRenders.size
                });
            };

            markRenders.sort((a, b) => a.offset - b.offset);

            let offset = 0;
            for (const markRender of markRenders) {
                if (markRender.offset > offset) {
                    renderSegment(source.slice(offset, markRender.offset));
                    offset = markRender.offset;
                }

                node.appendText('/* ');
                await this.render(node, markRender.content, markRender, nestedViewRenderContext);
                node.appendText(' */');
            }

            if (offset < source.length) {
                renderSegment(source.slice(offset));
            }
        } else {
            renderSegment(source);
        }

        node.appendText('\n\`\`\`\n');

        function renderLineNum() {
            const lineNum = lineNums.shift();
            const text = typeof lineNum === 'string' ? lineNum + ' │ ' : '';

            return text;
        }

        function renderSegment(segment) {
            const lines = segment.split(/\r\n?|\n/);

            node.appendText(lines[0]);

            for (let i = 1; i < lines.length; i++) {
                node.appendText('\n' + renderLineNum() + lines[i]);
            }
        }
    }, {
        props
    });
}
