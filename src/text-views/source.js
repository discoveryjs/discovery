import usage from './source.usage.js';

const props = `is not array? | {
    source: #.props has no 'source' ? is string ?: content is string ? content : source,
    syntax,
    lineNum is function ?: is not undefined ? bool() : true,
    marks is array ?: null
} | overrideProps()`;

export default function(host) {
    host.textView.define('source', {
        type: 'block',
        props,
        usage,
        async render(node, props, data, context) {
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

            node.appendLine().appendText(`\`\`\`${syntax || ''}`);
            node.appendText(renderLineNum());

            if (Array.isArray(marks)) {
                for (const mark of marks) {
                    if (!mark || typeof mark !== 'object') {
                        host.logger.warn('Bad value for an entry in "source" view props.mark, must be an object', { props, mark });
                        return;
                    }

                    const markOffset = typeof mark.offset === 'number' && isFinite(mark.offset)
                        ? Math.max(0, Math.round(mark.offset))
                        : undefined;

                    if (typeof markOffset !== 'number') {
                        host.logger.warn('Bad "offset" value for an entry in "source" view props.marks', { props, mark });
                        return;
                    }

                    markRenders.push({
                        ...mark,
                        offset: Math.max(0, Math.min(markOffset, source.length))
                    });
                };

                markRenders.sort((a, b) => a.offset - b.offset);

                let sourceOffset = 0;
                for (const markRender of markRenders) {
                    const { offset, content = [], prefix = '', postfix = '' } = markRender;

                    if (offset > sourceOffset) {
                        renderSegment(source.slice(sourceOffset, offset));
                        sourceOffset = offset;
                    }

                    node.appendText('/* ' + prefix);
                    await this.render(node, content, markRender, nestedViewRenderContext);
                    node.appendText(postfix + ' */');
                }

                if (sourceOffset < source.length) {
                    renderSegment(source.slice(sourceOffset));
                }
            } else {
                renderSegment(source);
            }

            node.appendLine().appendText('\`\`\`');

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
        }
    });
}
