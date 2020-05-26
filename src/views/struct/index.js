/* eslint-env browser */

import copyText from '../../core/utils/copy-text.js';
import value2html from './value-to-html.js';
import renderAnnotations from './render-annotations.js';
import {
    stringValueProto,
    arrayValueProto,
    objectValueProto,
    entryProtoEl,
    valueProtoEl,
    objectKeyProtoEl
} from './el-proto.js';

const hasOwnProperty = Object.prototype.hasOwnProperty;
const toString = Object.prototype.toString;
const defaultExpandedItemsLimit = 50;
const defaultCollapsedItemsLimit = 4;
const maxStringLength = 150;
const maxLinearStringLength = 50;

function isValueExpandable(value) {
    // array
    if (Array.isArray(value)) {
        return value.length > 0;
    }

    // string
    if (typeof value === 'string' && (value.length > maxStringLength || /[\r\n\f\t]/.test(value))) {
        return true;
    }

    // plain object
    if (value && toString.call(value) === '[object Object]') {
        for (const key in value) {
            if (hasOwnProperty.call(value, key)) {
                return true;
            }
        }
    }

    return false;
}

function appendText(el, text) {
    el.appendChild(document.createTextNode(text));
}

function formatSize(size) {
    if (!size) {
        return '';
    }

    return ', ' + String(size.length).replace(/\B(?=(\d{3})+$)/g, '<span class="num-delim"></span>') + ' bytes';
}

function renderValueSize(el, entries, unit) {
    if (entries.length > 1) {
        appendText(el.lastElementChild, entries.length + ' ' + unit);
    }
}

function renderSorting(el, entries, sort) {
    let sorted = entries.length <= 1 || entries.every(([key], idx) => idx === 0 || key > entries[idx - 1][0]);

    if (sorted) {
        el.querySelector('[data-action="toggle-sort-keys"]').remove();
    } else if (sort) {
        entries.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
    }
}

function renderObjectKey(container, name) {
    const objectKeyEl = objectKeyProtoEl.cloneNode(true);

    appendText(objectKeyEl.firstElementChild, name);
    container.appendChild(objectKeyEl);
}

export default function(discovery) {
    function collapseValue(el) {
        const options = elementOptions.get(el);
        const data = elementData.get(el);

        el.classList.add('struct-expand-value');
        el.innerHTML = value2html(data, false, options);
    }

    function expandValue(el, autoExpandLimit, sort) {
        const data = elementData.get(el);

        el.classList.remove('struct-expand-value');

        // at this point we assume that a data is a string, an array or an object,
        // since only such types of data expandable
        if (typeof data === 'string') {
            // string
            const valueEl = stringValueProto.cloneNode(true);
            const stringValueEl = valueEl.lastChild.previousSibling;
            const text = JSON.stringify(data);

            appendText(stringValueEl.firstChild, text.slice(1, -1));
            appendText(stringValueEl.previousSibling, `length: ${text.length} chars`);

            el.innerHTML = '';
            el.appendChild(valueEl);
        } else if (Array.isArray(data)) {
            // array
            const context = elementContext.get(el);
            const options = elementOptions.get(el);

            el.innerHTML = '';
            el.appendChild(arrayValueProto.cloneNode(true));

            renderValueSize(el, data, 'elements');
            renderEntries(el, el.lastChild, data, (entryEl, value, index) => {
                renderValue(entryEl, value, autoExpandLimit, options, Object.freeze({
                    parent: context,
                    host: data,
                    key: index,
                    index
                }));
            }, 0, options.limit);
        } else {
            // object
            const context = elementContext.get(el);
            const options = elementOptions.get(el);
            const entries = Object.entries(data);

            el.innerHTML = '';
            el.appendChild(objectValueProto.cloneNode(true));

            renderValueSize(el, entries, 'entries');
            renderSorting(el, entries, sort);
            renderEntries(el, el.lastChild, entries, (entryEl, [key, value], index) => {
                renderObjectKey(entryEl, key);
                renderValue(entryEl, value, autoExpandLimit, options, Object.freeze({
                    parent: context,
                    host: data,
                    key,
                    index
                }));
            }, 0, options.limit);
        }
    }

    function renderValue(container, value, autoExpandLimit, options, context) {
        const expandable = isValueExpandable(value);
        const valueEl = valueProtoEl.cloneNode(true);

        elementData.set(valueEl, value);
        elementContext.set(valueEl, context);
        elementOptions.set(valueEl, options);

        if (expandable && typeof value !== 'string' && autoExpandLimit) {
            // expanded
            container.classList.add('struct-expanded-value');
            expandValue(valueEl, autoExpandLimit - 1);
        } else {
            // collapsed
            if (expandable) {
                valueEl.classList.add('struct-expand-value');
            }

            valueEl.innerHTML = value2html(value, false, options);
        }

        applyAnnotations(valueEl, value, options, context);
        container.appendChild(valueEl);
    }

    function renderEntries(container, beforeEl, entries, renderEntryContent, offset = 0, limit = defaultExpandedItemsLimit) {
        const lastIndex = entries.length - offset - 1;
        const buffer = document.createDocumentFragment();

        if (limit === false) {
            limit = entries.length;
        }

        entries
            .slice(offset, offset + limit)
            .forEach((entry, index) => {
                const el = entryProtoEl.cloneNode(true);

                renderEntryContent(el, entry, offset + index);
                if (index !== lastIndex) {
                    appendText(el, ',');
                }

                buffer.appendChild(el);
            });

        container.insertBefore(buffer, beforeEl);

        discovery.view.maybeMoreButtons(
            container,
            beforeEl,
            entries.length,
            offset + limit,
            limit,
            (offset, limit) => renderEntries(container, beforeEl, entries, renderEntryContent, offset, limit)
        );
    }

    function applyAnnotations(el, value, options, context) {
        for (const annotation of options.annotations) {
            try {
                const { query, debug } = annotation;
                const data = discovery.query(query, value, context);

                if (debug) {
                    console.info({ annotation, value, context, data });
                }

                if (data) {
                    annotationsToRender.push({ el, data });
                }
            } catch (e) {
                console.error(e);
            }
        }

        scheduleApplyAnnotations();
    }

    function scheduleApplyAnnotations() {
        if (annotationsTimer === null && annotationsToRender.length) {
            annotationsTimer = Promise.resolve().then(() => {
                annotationsTimer = null;
                renderAnnotations(annotationsToRender);

                if (annotationsToRender.length) {
                    scheduleApplyAnnotations();
                }
            }, 0);
        }
    }

    const elementData = new WeakMap();
    const elementContext = new WeakMap();
    const elementOptions = new WeakMap();
    const structViewRoots = new WeakSet();
    const annotationsToRender = [];
    let annotationsTimer = null;

    const valueActionsPopup = new discovery.view.Popup({
        className: 'view-struct-actions-popup',
        render: (popupEl, triggerEl) => {
            const data = elementData.get(triggerEl.parentNode);
            let actions = [];

            if (typeof data === 'string') {
                actions = [
                    {
                        text: 'Copy as quoted string',
                        action: () => copyText(JSON.stringify(data))
                    },
                    {
                        text: 'Copy as unquoted string',
                        action: () => copyText(JSON.stringify(data).slice(1, -1))
                    },
                    {
                        text: 'Copy a value (unescaped)',
                        action: () => copyText(data)
                    }
                ];
            } else {
                let error = false;
                let stringifiedJson;

                try {
                    stringifiedJson = JSON.stringify(data);
                } catch (e) {
                    error = 'Can\'t be copied: ' + e.message;
                }

                actions = [
                    {
                        text: 'Copy as JSON (formatted)',
                        error,
                        disabled: Boolean(error),
                        action: () => copyText(JSON.stringify(data, null, 4))
                    },
                    {
                        text: `Copy as JSON (compact${formatSize(stringifiedJson)})`,
                        error,
                        disabled: Boolean(error),
                        action: () => copyText(stringifiedJson)
                    }
                ];
            }

            discovery.view.render(popupEl, {
                view: 'menu',
                onClick(item) {
                    valueActionsPopup.hide();
                    item.action();
                },
                item: [
                    'html:text',
                    {
                        view: 'block',
                        className: 'error',
                        when: 'error',
                        content: 'text:error'
                    }
                ]
            }, actions);
        }
    });
    const signaturePopup = new discovery.view.Popup({
        hoverPin: 'popup-hover',
        hoverTriggers: '.view-struct .show-signature',
        render: function(popupEl, triggerEl) {
            const el = triggerEl.parentNode;
            const path = [];
            const data = elementData.get(el);
            let context = elementContext.get(el);

            while (context !== null && context.parent !== null) {
                path.unshift(context.key);
                context = context.parent;
            }

            discovery.view.render(popupEl, {
                view: 'signature',
                expanded: 2,
                path
            }, data);
        }
    });

    const clickHandler = ({ target }) => {
        let action = 'expand';
        let cursor = target.closest(`
            .view-struct.struct-expand,
            .view-struct .struct-expand-value,
            .view-struct .struct-action-button
        `);

        if (!cursor) {
            return;
        }

        if (cursor.dataset.action) {
            action = cursor.dataset.action;
        }

        switch (action) {
            case 'expand':
                if (cursor.classList.contains('struct-expand')) {
                    // expand root element
                    cursor = cursor.lastChild;
                }

                // expand value
                expandValue(cursor, 0);
                scheduleApplyAnnotations();
                cursor.parentNode.classList.add('struct-expanded-value');

                if (structViewRoots.has(cursor.parentNode)) {
                    cursor.parentNode.classList.remove('struct-expand');
                }
                break;

            case 'collapse':
                cursor = cursor.parentNode;
                collapseValue(cursor);
                scheduleApplyAnnotations();
                cursor.parentNode.classList.remove('struct-expanded-value');

                if (structViewRoots.has(cursor.parentNode)) {
                    cursor.parentNode.classList.add('struct-expand');
                }
                break;

            case 'show-signature':
                signaturePopup.show(cursor);
                break;

            case 'value-actions':
                valueActionsPopup.show(cursor);
                break;

            case 'toggle-sort-keys':
                expandValue(cursor.parentNode, 0, cursor.parentNode.classList.toggle('sort-keys'));
                scheduleApplyAnnotations();
                break;

            case 'toggle-string-mode':
                cursor = cursor.parentNode;

                const stringTextNode = cursor.querySelector('.string-text').firstChild;

                stringTextNode.nodeValue = cursor.classList.toggle('string-value-as-text')
                    ? JSON.parse(`"${stringTextNode.nodeValue}"`)
                    : JSON.stringify(stringTextNode.nodeValue).slice(1, -1);
                break;
        }
    };

    // single event handler for all `struct` view instances
    discovery.addGlobalEventListener('click', clickHandler, false);

    discovery.view.define('struct', function(el, config, data) {
        const { expanded, limit, limitCollapsed, annotations } = config; // FIXME: add limit option
        const expandable = isValueExpandable(data);
        const options = {
            limitCollapsed: discovery.view.listLimit(limitCollapsed, defaultCollapsedItemsLimit),
            limit: discovery.view.listLimit(limit, defaultExpandedItemsLimit),
            annotations: discovery.annotations.concat(annotations || []),
            maxStringLength,
            maxLinearStringLength
        };

        structViewRoots.add(el);
        renderValue(el, data, expanded, options, {
            parent: null,
            host: { '': data },
            key: '',
            index: 0
        });
        scheduleApplyAnnotations();

        if (expandable && !expanded) {
            el.classList.add('struct-expand');
        }
    });

    // FIXME: this function never call
    return () => {
        document.removeEventListener('click', clickHandler, false);
    };
}
