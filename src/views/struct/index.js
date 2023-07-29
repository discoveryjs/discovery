/* eslint-env browser */

import { numDelim } from '../../core/utils/html.js';
import { createClickHandler } from './click-handler.js';
import { createValueActionsPopup } from './popup-value-actions.js';
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
import { createSignaturePopup } from './poup-signature.js';

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

function renderValueSize(el, entries, unit) {
    if (entries.length > 1) {
        el.lastElementChild
            .innerHTML = numDelim(entries.length) + ' ' + unit;
    }
}

function renderSorting(el, entries, sort) {
    const sorted = entries.length < 2 ||
        entries.every(([key], idx) => idx === 0 || key > entries[idx - 1][0]);

    if (sorted) {
        el.querySelector('[data-action="toggle-sort-keys"]').remove();
    } else if (sort) {
        entries.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
    }
}

function renderObjectKey(container, name, maxLength) {
    const objectKeyEl = objectKeyProtoEl.cloneNode(true);
    const fittedToMaxLength = name.length > maxLength
        ? name.slice(0, maxLength) + '…'
        : name;

    appendText(objectKeyEl.firstElementChild, fittedToMaxLength);
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
                    host.log(
                        'info',
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
                host.log('error', e);
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
            });
        }
    }

    const elementData = new WeakMap();
    const elementContext = new WeakMap();
    const elementOptions = new WeakMap();
    const structViewRoots = new WeakSet();
    const annotationsToRender = [];
    let annotationsTimer = null;

    const valueActionsPopup = createValueActionsPopup(host, elementData, buildPathForElement);
    const signaturePopup = createSignaturePopup(host, elementData, buildPathForElement);
    const clickHandler = createClickHandler(
        expandValue,
        collapseValue,
        scheduleApplyAnnotations,
        renderTable,
        structViewRoots,
        valueActionsPopup,
        signaturePopup
    );

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
