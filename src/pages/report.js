/* eslint-env browser */
import { createElement } from '../core/utils/dom.js';
import { encodeParams, decodeParams } from './report/params.js';
import { BlockPool } from './report/block.js';
import createHeader from './report/header.js';
import createQueryBlock from './report/editor-query.js';
import createViewBlock from './report/editor-view.js';
import createMarkdownBlock from './report/editor-markdown.js';

export default function(discovery) {
    function updateParams(delta, replace) {
        return discovery.setPageParams({
            ...discovery.pageParams,
            ...delta
        }, replace);
    }

    function createFlowWriter() {
        let afterEl = header.el;

        return el => {
            if (afterEl.nextSibling !== el) {
                afterEl.after(el);
            }

            return afterEl = el;
        };
    }

    function getInsertPoint(pipeline, idx) {
        return createElement('div', 'insert-point',
            Object.keys(pipelineHandlers)
                .map(type => createElement('span', {
                    class: 'add-block',
                    onclick() {
                        pipeline.splice(idx, 0, [type]);
                        updateParams({ pipeline }, true);
                    }
                }, type))
        );
    }

    const pipelineHandlers = {
        query: createQueryBlock,
        view: createViewBlock,
        markdown: createMarkdownBlock
    };

    const blocksPool = new BlockPool(discovery, pipelineHandlers);
    const header = createHeader(discovery, updateParams);

    //
    // Page
    //
    discovery.page.define('report', function(el, data, context) {
        const editable = !context.params.noedit && !context.params.dzen;
        const pipeline = context.params.pipeline;
        const dataIndex = [data];
        const insert = createFlowWriter();

        blocksPool.resetUsedBlocks();

        // update report header
        header.render(data, context);

        for (const child of el.children) {
            if (child.classList.contains('insert-point')) {
                child.remove();
            }
        }

        editable && insert(getInsertPoint(pipeline, 0));

        for (let idx = 0; idx < pipeline.length; idx++) {
            const [type, content, params] = pipeline[idx];
            const { dataIn = dataIndex.length - 1 } = params || {};
            const dataOut = dataIndex.length;
            const block = blocksPool.get(type);
            const result = block.perform(content, dataIndex[dataIn], context, {
                dataIn,
                dataOut,
                editable,
                toggleEditor: () => {
                    block.toggleEditor();
                },
                updateContent: (newContent, forcePerform) => {
                    pipeline[idx][1] = newContent;
                    updateParams({ pipeline }, true);

                    if (forcePerform) {
                        block.resetCache();
                        discovery.scheduleRender('page'); // force render
                    }
                }
            });

            context = 'context' in result ? result.context : context;
            if ('data' in result) {
                dataIndex.push(result.data);
            }

            insert(block.el);
            block.onDelete = () => {
                pipeline.splice(idx, 1);
                updateParams({ pipeline }, true);
            };

            if (result.error) {
                break;
            }

            editable && insert(getInsertPoint(pipeline, idx + 1));
        }

        // remove unused blocks
        blocksPool.removeUnusedBlocks();
    }, {
        reuseEl: true,
        init(el) {
            el.appendChild(header.el);
        },
        encodeParams,
        decodeParams
    });
}
