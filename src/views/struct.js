/* eslint-env browser */

import { escapeHtml } from '../core/utils/html.js';
import { createElement, createFragment } from '../core/utils/dom.js';
import copyText from '../core/utils/copy-text.js';

const hasOwnProperty = Object.prototype.hasOwnProperty;
const toString = Object.prototype.toString;
const defaultExpandedItemsLimit = 50;
const defaultCollapsedItemsLimit = 4;
const maxStringLength = 150;
const maxLinearStringLength = 50;
const urlRx = /^(?:https?:)?\/\/(?:[a-z0-9]+(?:\.[a-z0-9]+)+|\d+(?:\.\d+){3})(?:\:\d+)?(?:\/\S*?)?$/i;

const valueButtons = {
    get collapse() {
        return createElement('span', {
            class: 'struct-action-button struct-collapse-value',
            'data-action': 'collapse'
        });
    },
    get signature() {
        return createElement('span', {
            class: 'struct-action-button show-signature',
            'data-action': 'show-signature'
        });
    },
    get actions() {
        return createElement('span', {
            class: 'struct-action-button',
            title: 'Value actions',
            'data-action': 'value-actions'
        });
    },
    get stringMode() {
        return createElement('span', {
            class: 'struct-action-button',
            title: 'Toggle string show mode',
            'data-action': 'toggle-string-mode'
        });
    },
    get sortKeys() {
        return createElement('span', {
            class: 'struct-action-button',
            title: 'Toggle key sorting',
            'data-action': 'toggle-sort-keys'
        });
    }
};
const stringValueProto = createFragment(
    '"',
    valueButtons.collapse,
    valueButtons.actions,
    valueButtons.stringMode,
    createElement('span', 'string-length'),
    createElement('span', 'string-text-wrapper', [
        createElement('span', 'string-text')
    ]),
    '"'
);
const arrayValueProto = createFragment(
    '[',
    valueButtons.collapse,
    valueButtons.signature,
    valueButtons.actions,
    createElement('span', 'value-size'),
    ']'
);
const objectValueProto = createFragment(
    '{',
    valueButtons.collapse,
    valueButtons.signature,
    valueButtons.actions,
    valueButtons.sortKeys,
    createElement('span', 'value-size'),
    '}'
);
const entryProtoEl = createElement('div', 'entry-line');
const valueProtoEl = createElement('span', 'value');
const objectKeyProtoEl = createElement('span', 'label', [
    '\xA0 \xA0 ',
    createElement('span', 'property'),
    ':\xA0'
]);

function token(type, str) {
    return `<span class="${type}">${str}</span>`;
}

function more(num) {
    return token('more', `…${num} more…`);
}

function value2htmlString(value, linear, options) {
    switch (typeof value) {
        case 'boolean':
        case 'undefined':
            return token('keyword', value);

        case 'number':
        case 'bigint': {
            let str = String(value);

            if (str.length > 3) {
                str = str.replace(/\..+$|\B(?=(\d{3})+(\D|$))/g, m => m || '<span class="num-delim"></span>');
            }

            return token('number', str);
        }

        case 'symbol':
            return token('symbol', value);

        case 'function':
            return 'ƒn';

        case 'string': {
            const maxLength = linear ? maxLinearStringLength : maxStringLength;

            if (value.length > maxLength + 15) {
                return token(
                    'string',
                    escapeHtml(JSON.stringify(value.substr(0, maxLength)))
                        .replace(/"$/, more(value.length - maxLength) + '"')
                );
            }

            const str = escapeHtml(JSON.stringify(value));

            return token(
                'string',
                !linear && (value[0] === 'h' || value[0] === '/') && urlRx.test(value)
                    ? `"<a href="${escapeHtml(value)}" target="_blank">${str.substr(1, str.length - 2)}</a>"`
                    : str
            );
        }

        case 'object': {
            if (value === null) {
                return token('keyword', 'null');
            }

            // NOTE: constructor check and instanceof doesn't work here,
            // since a value may come from any runtime
            switch (toString.call(value)) {
                case '[object Array]': {
                    const limitCollapsed = options.limitCollapsed === false ? value.length : options.limitCollapsed;
                    const content = value.slice(0, limitCollapsed).map(val => value2htmlString(val, true, options));

                    if (value.length > limitCollapsed) {
                        content.push(`${more(value.length - limitCollapsed)} `);
                    }

                    return `[${content.join(', ')}]`;
                }

                case '[object Date]':
                    return token('date', value);

                case '[object RegExp]':
                    return token('regexp', value);
            }

            if (linear) {
                for (let key in value) {
                    if (hasOwnProperty.call(value, key)) {
                        return '{…}';
                    }
                }

                return '{}';
            }

            const limitCollapsed = options.limitCollapsed === false ? Infinity : options.limitCollapsed;
            const content = [];
            let count = 0;

            for (let key in value) {
                if (hasOwnProperty.call(value, key)) {
                    if (count < limitCollapsed) {
                        content.push(`${token('property', key)}: ${value2htmlString(value[key], true, options)}`);
                    }

                    count++;
                }
            }

            if (count > limitCollapsed) {
                content.push(more(count - limitCollapsed));
            }

            return content.length ? `{ ${content.join(', ')} }` : '{}';
        }

        default:
            return `unknown type "${typeof value}"`;
    }
}

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

function renderAnnotations(annotations) {
    const startTime = Date.now();
    const errors = [];
    let i = 0;

    for (; i < annotations.length; i++) {
        if (i % 20 === 0 && Date.now() - startTime > 10) {
            break;
        }

        const { el, data, annotation } = annotations[i];
        const { place, type = 'text', className } = annotation;
        const elClassName = [
            'value-annotation',
            place === 'before' ? 'before' : 'after',
            type,
            className || ''
        ].join(' ');
        let annotationEl;

        try {
            switch (type) {
                case 'text':
                    annotationEl = createElement('span', {
                        class: elClassName
                    }, [data]);
                    break;

                case 'link':
                    annotationEl = createElement('a', {
                        class: elClassName,
                        href: typeof data === 'string' ? data : data.href,
                        target: data.external ? '_blank' : undefined
                    }, [typeof data === 'string' ? data : data.text]);
                    break;

                case 'icon': {
                    const iconSrc = typeof data === 'string' ? data : data.src;
                    annotationEl = createElement(data.href ? 'a' : 'span', {
                        class: elClassName,
                        title: data.title || undefined,
                        href: data.href || undefined,
                        target: data.external ? '_blank' : undefined
                    });

                    if (iconSrc) {
                        annotationEl.style.setProperty('--annotation-image', `url("${iconSrc}")`);
                    }
                    break;
                }

                default:
                    console.warn('[Discovery] Bad annotation type `' + type + '`');
                    continue;
            }

            if (place === 'before') {
                el.before(annotationEl);
            } else {
                el.parentNode.append(annotationEl);
            }
        } catch (e) {
            errors.push(e);
        }
    }

    annotations.splice(0, i);

    if (errors.length) {
        console.groupCollapsed(`[Discovery] ${errors.length} errors in struct view during annotations render`);
        errors.forEach(e => console.error(e));
        console.groupEnd();
    }
}

export default function(discovery) {
    function collapseValue(el) {
        const options = elementOptions.get(el);
        const data = elementData.get(el);

        el.classList.add('struct-expand-value');
        el.innerHTML = value2htmlString(data, false, options);
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
            const entries = Object.entries(data);
            const valueEl  = arrayValueProto.cloneNode(true);

            renderValueSize(valueEl, entries, 'elements');
            renderEntries(valueEl, valueEl.lastChild, entries, (entryEl, _, value, index) => {
                renderValue(entryEl, value, autoExpandLimit, options, Object.freeze({
                    parent: context,
                    host: data,
                    key: index,
                    index
                }));
            }, 0, options.limit);

            el.innerHTML = '';
            el.appendChild(valueEl);
        } else {
            // object
            const context = elementContext.get(el);
            const options = elementOptions.get(el);
            const entries = Object.entries(data);
            const valueEl = objectValueProto.cloneNode(true);

            renderValueSize(valueEl, entries, 'entries');
            renderSorting(valueEl, entries, sort);
            renderEntries(valueEl, valueEl.lastChild, entries, (entryEl, key, value, index) => {
                renderObjectKey(entryEl, key);
                renderValue(entryEl, value, autoExpandLimit, options, Object.freeze({
                    parent: context,
                    host: data,
                    key,
                    index
                }));
            }, 0, options.limit);

            el.innerHTML = '';
            el.appendChild(valueEl);
        }
    }

    function renderValueLinks(container, data) {
        let links = discovery.resolveValueLinks(data);

        if (Array.isArray(links)) {
            links.forEach(({ type, href }) =>
                container.appendChild(createElement('a', { href, class: 'view-struct-auto-link' }, [type]))
            );
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

            valueEl.innerHTML = value2htmlString(value, false, options);
        }

        renderValueLinks(container, value);
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
            .forEach(([key, value], index) => {
                const el = entryProtoEl.cloneNode(true);

                renderEntryContent(el, key, value, offset + index);
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
                const data = discovery.query(annotation.data, value, context);

                if (data) {
                    annotationsToRender.push({ el, data, annotation });
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

            while (context !== null) {
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
            annotations: discovery.annotations.concat(annotations || [])
        };

        structViewRoots.add(el);
        renderValue(el, data, expanded, options, null);
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
