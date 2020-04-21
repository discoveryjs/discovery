/* eslint-env browser */
import { createElement } from '../core/utils/dom.js';
import { encodeParams, decodeParams } from './report/params.js';
import createHeader from './report/header.js';
import createQueryEditor from './report/editor-query.js';
import createViewEditor from './report/editor-view.js';

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

    function getBlock(type, pool) {
        const createdTypeBlocks = pool.get(type);

        if (createdTypeBlocks.length > 0) {
            return createdTypeBlocks.shift();
        }

        const actionsEl = createElement('div', 'report-block-actions', [
            createElement('button', {
                class: 'view-button delete',
                onclick: () => block.onDelete()
            }, 'x')
        ]);
        const editorEl = createElement('div', 'report-block-editor');
        const contentEl = createElement('div', 'report-block-content');
        const blockEl = createElement('div', 'report-block ' + type, [actionsEl, editorEl, contentEl]);

        const block = {
            el: blockEl,
            onDelete: () => {},
            handler: pipelineHandlers[type]({ editorEl, contentEl }, discovery, updateParams),
            cache: null
        };

        blockInstances.get(type).push(block);

        return block;
    }

    function getBlockResult(block, content, data, context, callback) {
        const { handler, cache } = block;

        if (cache === null ||
            cache.content !== content ||
            cache.data !== data ||
            cache.context !== context) {
            // update cache
            let result;

            try {
                result = handler(content, data, context, callback);
            } catch (error) {
                result = { error };
            }

            block.cache = {
                content,
                data,
                context,
                result: result || {}
            };
        } else {
            console.log('From cache', block.cache);
        }

        return block.cache.result;
    }

    function getInsertPoint(pipeline, idx) {
        const tmpEl = document.createElement('div');
        tmpEl.className = 'insert-point';
        discovery.view.render(tmpEl, {
            view: 'button',
            content: 'text:"+"',
            onClick: (el) => {
                shareOptionsPopup.show(el, (popupEl, triggerEl, hide) => discovery.view.render(popupEl, {
                    view: 'menu',
                    data: Object.keys(pipelineHandlers),
                    onClick(type) {
                        hide();
                        pipeline.splice(idx, 0, [type]);
                        updateParams({ pipeline }, true);
                    }
                }));
            }
        });

        return tmpEl;
    }

    const pipelineHandlers = {
        query: createQueryEditor,
        view: createViewEditor
    };
    const blockInstances = new Map(Object.keys(pipelineHandlers).map(type => [type, []]));
    const header = createHeader(discovery, updateParams);
    const shareOptionsPopup = new discovery.view.Popup();

    //
    // Page
    //
    discovery.page.define('report', function(el, data, context) {
        const noedit = context.params.noedit || context.params.dzen;
        const pipeline = context.params.pipeline;
        const results = [];
        const createdBlocksPool = new Map([...blockInstances].map(([key, value]) => [key, value.slice()]));
        const insert = createFlowWriter();

        // update report header
        header.render(data, context);

        for (const child of el.children) {
            if (child.classList.contains('insert-point')) {
                child.remove();
            }
        }

        !noedit && insert(getInsertPoint(pipeline, 0));

        for (let idx = 0; idx < pipeline.length; idx++) {
            const [type, content] = pipeline[idx];
            const block = getBlock(type, createdBlocksPool);
            const result = getBlockResult(block, content, data, context, (newContent, forceRender) => {
                pipeline[idx][1] = newContent;
                updateParams({ pipeline }, true);

                if (forceRender) {
                    block.cache = null;
                    // FIXME: need to rerender blocks from current only
                    discovery.scheduleRender('page'); // force render
                }
            });

            console.log({ content, data, context }, result);

            data = 'data' in result ? result.data : data;
            context = 'context' in result ? result.context : context;
            results.push(result);

            block.el.classList.toggle('editable', !noedit);
            block.onDelete = () => {
                pipeline.splice(idx, 1);
                updateParams({ pipeline }, true);
            };

            insert(block.el);
            !noedit && insert(getInsertPoint(pipeline, idx + 1));

            if (result.error) {
                break;
            }
        }

        // remove unused blocks
        createdBlocksPool.forEach(blocks => blocks.forEach(block => block.el.remove()));
    }, {
        reuseEl: true,
        init(el) {
            el.appendChild(header.el);
        },
        encodeParams,
        decodeParams
    });
}
