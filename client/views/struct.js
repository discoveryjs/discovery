/* eslint-env browser */

import { escapeHtml } from '../core/utils/html.js';

const hasOwnProperty = Object.prototype.hasOwnProperty;
const toString = Object.prototype.toString;
const urlRx = /^(?:https?:)?\/\/(?:[a-z0-9]+(?:\.[a-z0-9]+)+|\d+(?:\.\d+){3})(?:\:\d+)?(?:\/\S*?)?$/i;
const collapseEl = document.createElement('span');
const LIST_ITEM_LIMIT = 50;
const ARRAY_ITEM_LIMIT = 4;
const OBJECT_KEYS_LIMIT = 4;

collapseEl.className = 'struct-collapse-value';

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

        case 'string': {
            const str = escapeHtml(JSON.stringify(value));

            return token('string', !linear && (value[0] === 'h' || value[0] === '/') && urlRx.test(value)
                ? `"<a href="${escapeHtml(value)}">${str.substr(1, str.length - 2)}</a>"`
                : str
            );
        }

        case 'symbol':
            return token('symbol', value);

        case 'function':
            return 'ƒn';

        case 'object': {
            if (value === null) {
                return token('keyword', 'null');
            }

            if (Array.isArray(value)) {
                const content = value.slice(0, ARRAY_ITEM_LIMIT).map(val => value2htmlString(val, true)).join(', ');

                return (
                    '[' +
                        content +
                        (value.length > ARRAY_ITEM_LIMIT ? ', ' + more(value.length - ARRAY_ITEM_LIMIT) + ' ' : '') +
                    ']'
                );
            }

            // NOTE: constructor check and instanceof doesn't work here,
            // because value comes from sandbox
            if (toString.call(value) === '[object Date]') {
                return token('Date', value);
            }

            if (toString.call(value) === '[object RegExp]') {
                return token('RegExp', value);
            }

            if (!linear) {
                const res = [];
                let limit = OBJECT_KEYS_LIMIT;

                for (let key in value) {
                    if (hasOwnProperty.call(value, key)) {
                        if (limit > 0) {
                            res.push(token('property', key) + ': ' + value2htmlString(value[key], true));
                        }

                        limit--;
                    }
                }

                if (limit < 0) {
                    res.push(more(Math.abs(limit)));
                }

                return res.length ? '{ ' + res.join(', ') + ' }' : '{}';
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
            return 'unknown type `' + (typeof value) + '`';
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

    return (
        (type === 'array' && value.length > 0) ||
        (type === 'object' && Object.keys(value).length > 0)
    );
}

function appendText(el, text) {
    el.appendChild(document.createTextNode(text));
}

export default function(discovery) {
    function maybeExpand(valueEl, value, expandLimit) {
        elementDataMap.set(valueEl, value);
        if (expandLimit > 0) {
            expandValue(valueEl, expandLimit - 1);
        }
    }

    function collapseValue(el) {
        const data = elementDataMap.get(el);

        el.classList.add('struct-expand-value');
        el.innerHTML = value2htmlString(data);
    }

    function expandValue(el, expandLimit) {
        const data = elementDataMap.get(el);

        el.classList.remove('struct-expand-value');

        switch (getValueType(data)) {
            case 'array':
                el.innerHTML = '';

                appendText(el, '[');
                el.appendChild(collapseEl.cloneNode(true));
                render(el, data, false, expandLimit, (key, value, expandable) =>
                    renderValue(value, expandable)
                );
                appendText(el, ']');
                break;

            case 'object':
                el.innerHTML = '';

                appendText(el, '{');
                el.appendChild(collapseEl.cloneNode(true));
                render(el, data, true, expandLimit, (key, value, expandable) =>
                    '<span class="label">' +
                        '\xA0 \xA0 <span class="property">' + escapeHtml(key) + '</span>:\xA0' +
                    '</span>' +
                    renderValue(value, expandable)
                );
                appendText(el, '}');
                break;
        }
    }

    function renderValue(value, expandable) {
        let links = discovery.resolveValueLinks(value);

        if (Array.isArray(links)) {
            links = links.map(
                ({ type, href }) =>
                    `<a class="view-struct-auto-link" href="${href}">${type}</a>`
            ).join('');
        } else {
            links = '';
        }

        return (
            links +
            '<span class="value' + (expandable ? ' struct-expand-value' : '') + '">' +
                value2htmlString(value) +
            '</span>'
        );
    }

    function render(container, data, keys, expandLimit, fn) {
        discovery.view.render(container, {
            view: 'list',
            limit: LIST_ITEM_LIMIT,
            item: (el, config, key, { index, array }) => {
                const value = keys ? data[key] : key;
                const expandable = isValueExpandable(value);

                el.className = 'entry-line';
                el.innerHTML = fn(keys ? key : index, value, expandable);

                if (expandable) {
                    maybeExpand(el.lastChild, value, expandLimit);
                }

                if (index !== array.length - 1) {
                    el.appendChild(document.createTextNode(','));
                }
            }
        }, keys ? Object.keys(data) : data);
    }

    const elementDataMap = new WeakMap();
    const clickHandler = (e) => {
        let cursor = e.target;

        while (cursor && cursor.classList) {
            if (cursor.classList.contains('struct-expand-value')) {
                expandValue(cursor, 0);
                if (cursor.isStructRoot) {
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
                if (cursor.isStructRoot) {
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

        el.innerHTML = renderValue(data, expandable);
        el.lastChild.isStructRoot = true;

        if (expandable) {
            if (!expanded) {
                el.classList.add('struct-expand');
            }
            maybeExpand(el.lastChild, data, expanded);
        }

    });

    // FIXME: this function never call
    return () => {
        document.removeEventListener('click', clickHandler, false);
    };
}
