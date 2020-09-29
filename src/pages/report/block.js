import { createElement } from '../../core/utils/dom.js';
import { escapeHtml } from '../../core/utils/html.js';

function count(value, one, many) {
    return value.length ? `${value.length} ${value.length === 1 ? one : many}` : 'empty';
}

function valueDescriptor(value) {
    if (Array.isArray(value)) {
        return `Array (${count(value, 'element', 'elements')})`;
    }

    if (value && typeof value === 'object') {
        return `Object (${count(Object.keys(value), 'entry', 'entries')})`;
    }

    return `Scalar (${value === null ? 'null' : typeof value})`;
}

export class Block {
    constructor(host, type, factory) {
        const headerBodyEl = createElement('div', 'body');
        const headerHintEl = createElement('a', {
            class: 'editor-hint',
            tabindex: -1,
            target: '_blank'
        });
        const headerEl = createElement('div', 'report-block-header', [
            createElement('div', 'label', [
                // createElement('button', {
                //     class: 'delete',
                //     title: 'Remove block',
                //     onclick: () => this.onDelete()
                // }),
                createElement('span', {
                    class: 'toggle',
                    title: 'Toggle editor',
                    onclick: () => this.toggleEditor()
                }),
                type
            ]),
            headerBodyEl,
            headerHintEl
        ]);

        const actionsEl = createElement('div', 'report-block-actions', []);
        const editorEl = createElement('div', 'report-block-editor');
        const contentEl = createElement('div', 'report-block-content');
        const outEl = createElement('div', 'report-block-out');
        const blockEl = createElement('div', 'report-block ' + type, [
            actionsEl,
            headerEl,
            editorEl,
            outEl,
            contentEl
        ]);

        this.host = host;
        this.el = blockEl;
        this.outEl = outEl;
        this.expandEditor = true;
        this.expandOut = false;
        this.onDelete = () => {};
        this.cache = null;
        this.handler = factory(host, {
            headerBodyEl,
            headerHintEl,
            editorEl,
            contentEl
        });
    }

    toggleEditor() {
        this.expandEditor = !this.expandEditor;
        this.el.classList.toggle('editor-collapsed', !this.expandEditor);
    }

    resetCache() {
        this.cache = null;
    }

    perform(content, data, context, params) {
        let { handler, cache } = this;
        const { dataIn, dataOut, editable } = params;

        this.el.firstChild.dataset.in = dataIn;
        this.el.classList.toggle('editable', editable);

        if (cache !== null &&
            cache.content === content &&
            cache.data === data &&
            cache.context === context) {
            return cache.result;
        }

        // update cache

        let result;

        this.outEl.innerHTML = '';
        this.el.classList.remove('error');

        try {
            result = handler(content, data, context, params) || {};

            if ('data' in result) {
                this.host.view.render(this.outEl, {
                    view: 'expand',
                    title: `text:"Out [${dataOut}]: ${
                        valueDescriptor(result.data)
                    }${
                        'time' in result ? ` in ${parseInt(result.time, 10)}ms` : ''
                    }"`,
                    expanded: this.expandOut,
                    onToggle: state => this.expandOut = state,
                    content: {
                        view: 'struct',
                        expanded: 1,
                        limit: 10
                    }
                }, result.data);
            }
        } catch (error) {
            console.error(error);

            this.el.classList.add('error');
            this.host.view.render(this.outEl, {
                view: 'block',
                className: 'report-error',
                content: 'html:$ + "<br>(see details in console)"'
            }, escapeHtml(String(error)));

            result = { error };
        }

        this.cache = {
            content,
            data,
            context,
            result
        };

        return result;
    }
}

export class BlockPool {
    constructor(host, factories) {
        this.host = host;
        this.factories = factories;
        this.blocks = new Map(Object.keys(factories).map(type => [type, []]));
        this.resetUsedBlocks();
    }

    resetUsedBlocks() {
        this.blocksPool = new Map(
            [...this.blocks]
                .map(([key, value]) => [key, value.slice()])
        );
    }
    removeUnusedBlocks() {
        this.blocksPool.forEach(
            blocks => blocks.forEach(
                block => block.el.remove()
            )
        );
    }

    get(type) {
        const createdTypeBlocks = this.blocksPool.get(type);

        if (createdTypeBlocks.length > 0) {
            return createdTypeBlocks.shift();
        }

        const block = new Block(this.host, type, this.factories[type]);

        this.blocks.get(type).push(block);

        return block;
    }
}


