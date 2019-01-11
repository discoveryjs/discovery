/* eslint-env browser */

import { escapeHtml } from '../core/utils/html.js';
import { createElement, createFragment } from '../core/utils/dom.js';

const hasOwnProperty = Object.prototype.hasOwnProperty;
const toString = Object.prototype.toString;
const expandedItemsLimit = 50;
const collapedItemsLimit = 4;
const urlRx = /^(?:https?:)?\/\/(?:[a-z0-9]+(?:\.[a-z0-9]+)+|\d+(?:\.\d+){3})(?:\:\d+)?(?:\/\S*?)?$/i;
const arrayValueProto = createFragment('[', createElement('span', 'struct-collapse-value'), ']');
const objectValueProto = createFragment('{', createElement('span', 'struct-collapse-value'), '}');
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
    return token('more', '…' + num + ' more…');
}

function value2htmlString(value, linear) {
    switch (typeof value) {
        case 'boolean':
        case 'undefined':
            return token('keyword', value);

        case 'number':
        case 'bigint':
            return token('number', value);

        case 'symbol':
            return token('symbol', value);

        case 'function':
            return 'ƒn';

        case 'string': {
            const str = escapeHtml(JSON.stringify(value));

            return token('string', !linear && (value[0] === 'h' || value[0] === '/') && urlRx.test(value)
                ? `"<a href="${escapeHtml(value)}">${str.substr(1, str.length - 2)}</a>"`
                : str
            );
        }

        case 'object': {
            if (value === null) {
                return token('keyword', 'null');
            }

            // NOTE: constructor check and instanceof doesn't work here,
            // since a value can come from any runtime
            switch (toString.call(value)) {
                case '[object Array]': {
                    const content = value.slice(0, collapedItemsLimit).map(val => value2htmlString(val, true));

                    if (value.length > collapedItemsLimit) {
                        content.push(`${more(value.length - collapedItemsLimit)} `);
                    }

                    return `[${content.join(', ')}]`;
                }

                case '[object Date]':
                    return token('date', value);

                case '[object RegExp]':
                    return token('regexp', value);
            }

            if (!linear) {
                const content = [];
                let count = 0;

                for (let key in value) {
                    if (hasOwnProperty.call(value, key)) {
                        if (count < collapedItemsLimit) {
                            content.push(`${token('property', key)}: ${value2htmlString(value[key], true)}`);
                        }

                        count++;
                    }
                }

                if (count > collapedItemsLimit) {
                    content.push(more(count - collapedItemsLimit));
                }

                return content.length ? `{ ${content.join(', ')} }` : '{}';
            } else {
                for (let key in value) {
                    if (hasOwnProperty.call(value, key)) {
                        return '{…}';
                    }
                }

                return '{}';
            }
        }

        default:
            return `unknown type "${typeof value}"`;
    }
}

function getValueType(value) {
    if (Array.isArray(value)) {
        return 'array';
    }

    if (value && toString.call(value) === '[object Object]') {
        return 'object';
    }

    return 'other';
}

function isValueExpandable(value) {
    const type = getValueType(value);

    if (type === 'array') {
        return value.length > 0;
    }

    if (type === 'object') {
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
        const data = elementData.get(el);

        el.classList.add('struct-expand-value');
        el.innerHTML = value2htmlString(data);
    }

    function expandValue(el, expandLimit) {
        const data = elementData.get(el);

        el.classList.remove('struct-expand-value');

        switch (getValueType(data)) {
            case 'array':
                el.innerHTML = '';
                el.appendChild(arrayValueProto.cloneNode(true));

                renderEntries(el, el.lastChild, Object.entries(data), (entryEl, key, value) => {
                    renderValue(entryEl, value, expandLimit);
                });
                break;

            case 'object':
                el.innerHTML = '';
                el.appendChild(objectValueProto.cloneNode(true));

                renderEntries(el, el.lastChild, Object.entries(data), (entryEl, key, value) => {
                    renderObjectKey(entryEl, key);
                    renderValue(entryEl, value, expandLimit);
                });
                break;
        }
    }

    function renderObjectKey(container, name) {
        const objectKeyEl = objectKeyProtoEl.cloneNode(true);

        appendText(objectKeyEl.firstElementChild, name);
        container.appendChild(objectKeyEl);
    }

    function renderValueLinks(container, value) {
        let links = discovery.resolveValueLinks(value);

        if (Array.isArray(links)) {
            links.forEach(({ type, href }) =>
                container.appendChild(createElement('a', { href, class: 'view-struct-auto-link' }, [type]))
            );
        }
    }

    function renderValue(container, value, expandLimit) {
        const expandable = isValueExpandable(value);
        const valueEl = valueProtoEl.cloneNode(true);

        if (expandable && expandLimit) {
            // expanded
            elementData.set(valueEl, value);
            expandValue(valueEl, expandLimit - 1);
        } else {
            // collapsed
            if (expandable) {
                elementData.set(valueEl, value);
                valueEl.classList.add('struct-expand-value');
            }

            valueEl.innerHTML = value2htmlString(value);
        }

        renderValueLinks(container, value);
        container.appendChild(valueEl);
    }

    function renderEntries(container, beforeEl, entries, renderEntryContent, offset = 0, limit = expandedItemsLimit) {
        const lastIndex = entries.length - offset - 1;

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

    const elementData = new WeakMap();
    const structViewRoots = new WeakSet();
    const clickHandler = ({ target: cursor }) => {
        while (cursor && cursor.classList) {
            if (cursor.classList.contains('struct-expand-value')) {
                expandValue(cursor, 0);

                if (structViewRoots.has(cursor.parentNode)) {
                    cursor.parentNode.classList.remove('struct-expand');
                }

                break;
            }

            if (cursor.classList.contains('struct-expand')) {
                cursor.classList.remove('struct-expand');
                expandValue(cursor.lastChild, 0);
                break;
            }

            if (cursor.classList.contains('struct-collapse-value')) {
                cursor = cursor.parentNode;
                collapseValue(cursor);

                if (structViewRoots.has(cursor.parentNode)) {
                    cursor.parentNode.classList.add('struct-expand');
                }

                break;
            }

            cursor = cursor.parentNode;
        }
    };

    // single event handler for all `struct` view instances
    document.addEventListener('click', clickHandler, false);

    discovery.view.define('struct', function(el, config, data) {
        const { expanded } = config;
        const expandable = isValueExpandable(data);

        structViewRoots.add(el);
        renderValue(el, data, expanded);

        if (expandable && !expanded) {
            el.classList.add('struct-expand');
        }
    });

    // FIXME: this function never call
    return () => {
        document.removeEventListener('click', clickHandler, false);
    };
}
