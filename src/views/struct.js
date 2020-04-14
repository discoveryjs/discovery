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
    ']'
);
const objectValueProto = createFragment(
    '{',
    valueButtons.collapse,
    valueButtons.signature,
    valueButtons.actions,
    valueButtons.sortKeys,
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

    // a string
    if (typeof value === 'string' && (value.length > maxStringLength || /[\r\n\f\t]/.test(value))) {
        return true;
    }

    // a plain object
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

export default function(discovery) {
    function collapseValue(el) {
        const options = elementOptions.get(el);
        const data = elementData.get(el);

        el.classList.add('struct-expand-value');
        el.innerHTML = value2htmlString(data, false, options);
    }

    function expandValue(el, autoExpandLimit, sort) {
        const options = elementOptions.get(el);
        const data = elementData.get(el);

        el.classList.remove('struct-expand-value');

        // at this point we assume that a data is a string, an array or an object,
        // since only such types of data expandable
        if (typeof data === 'string') {
            // string
            el.innerHTML = '';
            el.appendChild(stringValueProto.cloneNode(true));

            const stringValueEl = el.lastChild.previousSibling;
            const text = JSON.stringify(data);
            appendText(stringValueEl.firstChild, text.slice(1, -1));
            appendText(stringValueEl.previousSibling, `length: ${text.length} chars`);
        } else if (Array.isArray(data)) {
            // array
            el.innerHTML = '';
            el.appendChild(arrayValueProto.cloneNode(true));

            renderEntries(el, el.lastChild, Object.entries(data), (entryEl, key, data) => {
                renderValue(entryEl, data, {
                    ...options,
                    autoExpandLimit,
                    path: options.path.concat(Number(key))
                });
            }, 0, options.limit);
        } else {
            // object
            el.innerHTML = '';
            el.appendChild(objectValueProto.cloneNode(true));

            const entries = Object.entries(data);

            if (sort) {
                entries.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
            }

            renderEntries(el, el.lastChild, entries, (entryEl, key, data) => {
                renderObjectKey(entryEl, key);
                renderValue(entryEl, data, {
                    ...options,
                    autoExpandLimit,
                    path: options.path.concat(key)
                });
            }, 0, options.limit);
        }
    }

    function renderObjectKey(container, name) {
        const objectKeyEl = objectKeyProtoEl.cloneNode(true);

        appendText(objectKeyEl.firstElementChild, name);
        container.appendChild(objectKeyEl);
    }

    function renderValueLinks(container, data) {
        let links = discovery.resolveValueLinks(data);

        if (Array.isArray(links)) {
            links.forEach(({ type, href }) =>
                container.appendChild(createElement('a', { href, class: 'view-struct-auto-link' }, [type]))
            );
        }
    }

    function renderValue(container, data, options) {
        const expandable = isValueExpandable(data);
        const valueEl = valueProtoEl.cloneNode(true);

        if (expandable && typeof data !== 'string' && options.autoExpandLimit) {
            // expanded
            elementOptions.set(valueEl, options);
            elementData.set(valueEl, data);
            container.classList.add('struct-expanded-value');
            expandValue(valueEl, options.autoExpandLimit - 1);
        } else {
            // collapsed
            if (expandable) {
                elementOptions.set(valueEl, options);
                elementData.set(valueEl, data);
                valueEl.classList.add('struct-expand-value');
            }

            valueEl.innerHTML = value2htmlString(data, false, options);
        }

        renderValueLinks(container, data);
        container.appendChild(valueEl);
    }

    function renderEntries(container, beforeEl, entries, renderEntryContent, offset = 0, limit = defaultExpandedItemsLimit) {
        const lastIndex = entries.length - offset - 1;

        if (limit === false) {
            limit = entries.length;
        }

        entries
            .slice(offset, offset + limit)
            .forEach(([key, value], index) => {
                const el = entryProtoEl.cloneNode(true);

                renderEntryContent(el, key, value);
                if (index !== lastIndex) {
                    appendText(el, ',');
                }

                container.insertBefore(el, beforeEl);
            });

        discovery.view.maybeMoreButtons(
            container,
            beforeEl,
            entries.length,
            offset + limit,
            limit,
            (offset, limit) => renderEntries(container, beforeEl, entries, renderEntryContent, offset, limit)
        );
    }

    function formatSize(size) {
        if (!size) {
            return '';
        }

        return ', ' + String(size.length).replace(/\B(?=(\d{3})+$)/g, '<span class="num-delim"></span>') + ' bytes';
    }

    const elementData = new WeakMap();
    const elementOptions = new WeakMap();
    const structViewRoots = new WeakSet();
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
            const options = elementOptions.get(triggerEl.parentNode);
            const data = elementData.get(triggerEl.parentNode);

            discovery.view.render(popupEl, {
                view: 'signature',
                expanded: 2,
                path: options.path
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
                cursor.parentNode.classList.add('struct-expanded-value');

                if (structViewRoots.has(cursor.parentNode)) {
                    cursor.parentNode.classList.remove('struct-expand');
                }
                break;

            case 'collapse':
                cursor = cursor.parentNode;
                collapseValue(cursor);
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
        const { expanded, limit, limitCollapsed } = config; // FIXME: add limit option
        const expandable = isValueExpandable(data);

        structViewRoots.add(el);
        renderValue(el, data, {
            autoExpandLimit: expanded,
            limitCollapsed: discovery.view.listLimit(limitCollapsed, defaultCollapsedItemsLimit),
            limit: discovery.view.listLimit(limit, defaultExpandedItemsLimit),
            path: []
        });

        if (expandable && !expanded) {
            el.classList.add('struct-expand');
        }
    });

    // FIXME: this function never call
    return () => {
        document.removeEventListener('click', clickHandler, false);
    };
}
