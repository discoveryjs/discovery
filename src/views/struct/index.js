/* eslint-env browser */

import { escapeHtml, numDelim } from '../../core/utils/html.js';
import { jsonStringifyInfo } from '../../core/utils/json.js';
import copyText from '../../core/utils/copy-text.js';
import value2html from './value-to-html.js';
import renderAnnotations from './render-annotations.js';
import usage from './struct.usage.js';
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
const defaultCollapsedObjectEntries = 0;
const defaultMaxStringLength = 150;
const defaultMaxCompactStringLength = 40;
const defaultAllowedExcessStringLength = 10;
const defaultMaxPropertyLength = Infinity;
const defaultMaxCompactPropertyLength = 35;

function intOption(value, defaultValue) {
    if (typeof value === 'number' && isFinite(value) && value >= 1) {
        return parseInt(value, 10);
    }

    return defaultValue;
}

function isValueExpandable(value, options) {
    // array
    if (Array.isArray(value)) {
        return value.length > 0;
    }

    // string
    if (typeof value === 'string' && (value.length > options.maxStringLength || /[\r\n\f\t]/.test(value))) {
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

    return ', ' + numDelim(size) + ' bytes';
}

function renderValueSize(el, entries, unit) {
    if (entries.length > 1) {
        el.lastElementChild
            .innerHTML = numDelim(entries.length) + ' ' + unit;
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

function renderObjectKey(container, name, maxLength) {
    const objectKeyEl = objectKeyProtoEl.cloneNode(true);
    const x = name.length > maxLength
        ? name.slice(0, maxLength) + '…'
        : name;

    appendText(objectKeyEl.firstElementChild, x);
    container.appendChild(objectKeyEl);
}

export default function(host) {
    function collapseValue(el) {
        const options = elementOptions.get(el);
        const data = elementData.get(el);

        el.classList.add('struct-expand-value');
        el.innerHTML = value2html(data, false, options);
    }

    function expandValue(el, autoExpandLimit, sort) {
        const data = elementData.get(el);

        el.classList.remove('struct-expand-value');

        // at this point we assume data is a string, an array or an object,
        // since only such types of data expandable
        if (typeof data === 'string') {
            // string
            const valueEl = stringValueProto.cloneNode(true);
            const stringValueEl = valueEl.lastChild.previousSibling;
            const text = JSON.stringify(data);

            appendText(stringValueEl.firstChild, text.slice(1, -1));
            stringValueEl.previousSibling.innerHTML = `length: ${numDelim(text.length)} chars`;

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
                renderObjectKey(entryEl, key, options.maxPropertyLength);
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
        const expandable = isValueExpandable(value, options);
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

        host.view.maybeMoreButtons(
            container,
            beforeEl,
            entries.length,
            offset + limit,
            limit,
            (offset, limit) => renderEntries(container, beforeEl, entries, renderEntryContent, offset, limit)
        );
    }

    function renderTable(el) {
        let data = elementData.get(el);

        if (!Array.isArray(data)) {
            data = Object.entries(data).map(([key, value]) => ({ '[key]': key, '[value]': value }));
        }

        host.view.render(el, 'table', data, {});
        el.append(el.lastChild.previousSibling);
    }

    function buildPathForElement(el) {
        let path = [];
        let context = elementContext.get(el);

        while (context !== null && context.parent !== null) {
            path.unshift(context.key);
            context = context.parent;
        }

        return path;
    }

    function applyAnnotations(el, value, options, context) {
        if (!options.annotations.length) {
            return;
        }

        for (const annotation of options.annotations) {
            try {
                const { query, debug } = annotation;
                const queryContext = { ...context, context: options.context };
                const config = host.query(query, value, queryContext);

                if (debug) {
                    console.info(
                        `Compute struct view annotation${typeof debug === 'string' ? ` "${debug}"` : ''}:`,
                        { data: value, context: queryContext, query, queryResult: config }
                    );
                }

                if (config) {
                    annotationsToRender.push(
                        config.tooltip
                            ? {
                                el,
                                config,
                                renderer: options.renderer,
                                data: value,
                                context: queryContext
                            }
                            : { el, config }
                    );
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

    const valueActionsPopup = new host.view.Popup({
        className: 'view-struct-actions-popup',
        render: (popupEl, triggerEl) => {
            const el = triggerEl.parentNode;
            const data = elementData.get(el);
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
                const path = host.pathToQuery(buildPathForElement(el));
                const maxAllowedSize = 1024 * 1024 * 1024;
                let jsonFormattedStringifyError = false;
                let jsonCompactStringifyError = false;
                let compactSize = 0;
                let formattedSize = 0;

                try {
                    const { minLength, circular } = jsonStringifyInfo(data);

                    compactSize = minLength;

                    if (circular.length) {
                        jsonCompactStringifyError = 'Converting circular structure to JSON';
                    } else if (compactSize > maxAllowedSize) {
                        jsonCompactStringifyError = 'Resulting JSON is over 1 Gb';
                    } else {
                        formattedSize = jsonStringifyInfo(data, null, 4).minLength;
                        if (formattedSize > maxAllowedSize) {
                            jsonFormattedStringifyError = 'Resulting JSON is over 1 Gb';
                        }
                    }
                } catch (e) {
                    jsonCompactStringifyError = /Maximum call stack size|too much recursion/i.test(e.message)
                        ? 'Too much nested structure'
                        : e.message;
                }

                if (jsonCompactStringifyError) {
                    jsonCompactStringifyError = 'Can\'t be copied: ' + jsonCompactStringifyError;

                    if (!jsonFormattedStringifyError) {
                        jsonFormattedStringifyError = jsonCompactStringifyError;
                    }
                }

                if (path) {
                    actions.push({
                        text: 'Copy path:',
                        notes: escapeHtml(path),
                        action: () => copyText(path)
                    });
                }

                actions.push({
                    text: 'Copy as JSON',
                    notes: `(formatted${formatSize(formattedSize)})`,
                    error: jsonFormattedStringifyError,
                    disabled: Boolean(jsonFormattedStringifyError),
                    action: () => copyText(JSON.stringify(data, null, 4))
                });
                actions.push({
                    text: 'Copy as JSON',
                    notes: `(compact${jsonCompactStringifyError ? '' : formatSize(compactSize)})`,
                    error: jsonCompactStringifyError,
                    disabled: Boolean(jsonCompactStringifyError),
                    action: () => copyText(JSON.stringify(data))
                });
            }

            host.view.render(popupEl, {
                view: 'menu',
                onClick(item) {
                    valueActionsPopup.hide();
                    item.action();
                },
                item: [
                    'html:text',
                    {
                        view: 'block',
                        when: 'notes',
                        className: 'notes',
                        content: 'html:notes'
                    },
                    {
                        view: 'block',
                        when: 'error',
                        className: 'error',
                        content: 'text:error'
                    }
                ]
            }, actions);
        }
    });
    const signaturePopup = new host.view.Popup({
        hoverPin: 'popup-hover',
        hoverTriggers: '.view-struct .show-signature',
        render: function(popupEl, triggerEl) {
            const el = triggerEl.parentNode;
            const data = elementData.get(el);

            host.view.render(popupEl, {
                view: 'signature',
                expanded: 2,
                path: buildPathForElement(el)
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
                cursor.classList.remove('view-as-table');

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

            case 'toggle-view-as-table':
                cursor = cursor.parentNode;

                const asTable = cursor.classList.toggle('view-as-table');

                if (asTable) {
                    renderTable(cursor);
                } else {
                    const tableEl = cursor.querySelector(':scope > .view-table');

                    if (tableEl) {
                        tableEl.remove();
                    }
                }
                break;
        }
    };

    // single event handler for all `struct` view instances
    host.addHostElEventListener('click', clickHandler, false);

    host.view.define('struct', function(el, config, data, context) {
        const {
            annotations,
            expanded,
            limit,
            limitCollapsed,
            limitCompactObjectEntries,
            maxStringLength,
            maxCompactStringLength,
            allowedExcessStringLength,
            maxPropertyLength,
            maxCompactPropertyLength
        } = config;
        const normalizedAnnotations = annotations
            ? (host.annotations || []).concat(annotations.map(annotation =>
                typeof annotation === 'string' || typeof annotation === 'function'
                    ? { query: annotation }
                    : annotation
            ))
            : host.annotations;

        const options = {
            renderer: this,
            context,
            annotations: normalizedAnnotations,
            limit: host.view.listLimit(limit, defaultExpandedItemsLimit),
            limitCollapsed: host.view.listLimit(limitCollapsed, defaultCollapsedItemsLimit),
            limitCompactObjectEntries: host.view.listLimit(limitCompactObjectEntries, defaultCollapsedObjectEntries),
            maxStringLength: intOption(maxStringLength, defaultMaxStringLength),
            maxCompactStringLength: intOption(maxCompactStringLength, defaultMaxCompactStringLength),
            allowedExcessStringLength: intOption(allowedExcessStringLength, defaultAllowedExcessStringLength),
            maxPropertyLength: intOption(maxPropertyLength, defaultMaxPropertyLength),
            maxCompactPropertyLength: intOption(maxCompactPropertyLength, defaultMaxCompactPropertyLength)
        };

        structViewRoots.add(el);
        renderValue(el, data, expanded, options, {
            parent: null,
            host: { '': data },
            key: '',
            index: 0
        });
        scheduleApplyAnnotations();

        if (!expanded && isValueExpandable(data, options)) {
            el.classList.add('struct-expand');
        }
    }, {
        usage
    });

    // FIXME: this function never call
    return () => {
        document.removeEventListener('click', clickHandler, false);
    };
}
