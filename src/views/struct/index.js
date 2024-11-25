/* eslint-env browser */

import { numDelim } from '../../core/utils/html.js';
import { isArray, isRegExp, isSet } from '../../core/utils/is-type.js';
import { hasOwn, objectToString } from '../../core/utils/object-utils.js';
import { createClickHandler } from './click-handler.js';
import { createValueActionsPopup } from './popup-value-actions.js';
import value2html, { stringifyIfNeeded } from './value-to-html.js';
import { concatAnnotations, getDefaultAnnotations, prepareAnnotations, preprocessAnnotations, renderAnnotations } from './render-annotations.js';
import usage from './struct.usage.js';
import {
    stringValueProto,
    arrayValueProto,
    objectValueProto,
    entryProtoEl,
    valueProtoEl,
    objectKeyProtoEl,
    matchProtoEl
} from './el-proto.js';
import { createSignaturePopup } from './poup-signature.js';
import { matchAll } from '../../core/utils/pattern.js';

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
    // string
    if (typeof value === 'string') {
        return value.length > options.maxStringLength || /[\r\n\f\t]/.test(value);
    }

    // arrays
    if (isArray(value)) {
        return value.length > 0;
    }

    // object-like values
    if (typeof value === 'object' && value !== null) {
        switch (objectToString(value)) {
            // set
            case '[object Set]': {
                return value.size > 0;
            }

            // plain object
            case '[object Object]': {
                for (const key in value) {
                    if (hasOwn(value, key)) {
                        return true;
                    }
                }
            }
        }
    }

    return false;
}

function appendText(el, text) {
    el.appendChild(document.createTextNode(text));
}

function renderValueSize(el, size, unit) {
    if (size > 1) {
        el.lastElementChild
            .innerHTML = numDelim(size) + ' ' + unit;
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

        if (el.annotationsEl) {
            el.parentNode.append(el.annotationsEl);
        }
    }

    function expandValue(el, autoExpandLimit, sort) {
        const data = elementData.get(el);

        el.classList.remove('struct-expand-value');

        // at this point we assume data is a string, an array or an object,
        // since only such types of data expandable
        if (typeof data === 'string') {
            // string
            const options = elementOptions.get(el);
            const valueEl = stringValueProto.cloneNode(true);
            const stringValueEl = valueEl.lastChild.previousSibling;
            const stringContentEl = stringValueEl.firstChild;
            const sizeEl = stringValueEl.previousSibling;
            const text = stringifyIfNeeded(data);

            sizeEl.innerHTML = `length: ${numDelim(text.length)} chars`;
            if (options.match) {
                matchAll(
                    data,
                    options.match,
                    chunk => stringContentEl.append(JSON.stringify(chunk).slice(1, -1)),
                    chunk => stringContentEl.appendChild(matchProtoEl.cloneNode()).append(JSON.stringify(chunk).slice(1, -1))
                );
            } else {
                appendText(stringContentEl, text);
            }

            el.replaceChildren(valueEl);
            moveAnnotationsEl(el, sizeEl);
        } else if (isArray(data) || isSet(data)) {
            // array
            const context = elementContext.get(el);
            const options = elementOptions.get(el);
            const size = typeof data.size === 'number' ? data.size : data.length;

            el.replaceChildren(arrayValueProto.cloneNode(true));

            renderValueSize(el, size, 'elements');
            moveAnnotationsEl(el, el.lastElementChild);
            renderEntries(el, el.lastChild, data.values(), size, (entryEl, value, index) => {
                if (index > 0 && index % 10 === 9) {
                    entryEl.dataset.index = index + 1;
                }

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

            el.replaceChildren(objectValueProto.cloneNode(true));

            renderValueSize(el, entries.length, 'entries');
            moveAnnotationsEl(el, el.lastElementChild);
            renderSorting(el, entries, sort);
            renderEntries(el, el.lastChild, entries.values(), entries.length, (entryEl, [key, value], index) => {
                if (index > 0 && index % 10 === 9) {
                    entryEl.dataset.index = index + 1;
                }

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

    function renderEntries(container, beforeEl, entries, entriesCount, renderEntryContent, offset = 0, limit = defaultExpandedItemsLimit) {
        if (limit === false) {
            limit = Infinity;
        }

        const buffer = document.createDocumentFragment();
        const lastIndex = entriesCount - 1;
        let rendered = 0;

        for (; rendered < limit; rendered++, offset++) {
            const { done, value: entry } = entries.next();

            if (done) {
                break;
            }

            const el = entryProtoEl.cloneNode(true);

            renderEntryContent(el, entry, offset);
            if (offset !== lastIndex) {
                appendText(el, ',');
            }

            buffer.appendChild(el);
        }

        container.insertBefore(buffer, beforeEl);

        host.view.maybeMoreButtons(
            container,
            beforeEl,
            entriesCount,
            offset,
            limit,
            (offset, limit) => renderEntries(container, beforeEl, entries, entriesCount, renderEntryContent, offset, limit)
        );
    }

    function renderTable(el) {
        const options = elementOptions.get(el);
        let data = elementData.get(el);

        if (!isArray(data) && !isSet(data)) {
            data = Object.entries(data).map(([key, value]) => ({ '[key]': key, '[value]': value }));
        }

        host.view.render(el, 'table', data, options.context);
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

    function moveAnnotationsEl(valueEl, relEl) {
        if (valueEl.annotationsEl) {
            relEl.after(valueEl.annotationsEl);
        }
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
                    host.logger.info(
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
                host.logger.error(e.message);
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
    const defaultAnnotations = getDefaultAnnotations(host);
    let customAnnotations = defaultAnnotations;
    let annotationsTimer = null;

    const valueActionsPopup = createValueActionsPopup(host, elementData, elementContext, buildPathForElement);
    const signaturePopup = createSignaturePopup(host, elementData, elementContext, elementOptions, buildPathForElement);
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

    // define an action to set custom annotations
    if (!host.legacyPrepare) {
        host.action.define('setStructViewAnnotations', (newAnnotations) => {
            customAnnotations = concatAnnotations(
                defaultAnnotations,
                preprocessAnnotations(newAnnotations)
            );
        });
    }

    host.view.define('struct', function(el, config, data, context) {
        const {
            annotations,
            match,
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
        const normalizedAnnotations = prepareAnnotations(
            annotations,
            !host.legacyPrepare
                ? customAnnotations
                // FIXME: that's a fallback to work with legacy prepare,
                // remove when discard model-legacy-extension-api
                : host.annotations
        );

        const options = {
            renderer: this,
            context,
            annotations: normalizedAnnotations || [],
            match: isRegExp(match) || typeof match === 'string' ? match : null,
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

        if ((!expanded || typeof data === 'string') && isValueExpandable(data, options)) {
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
