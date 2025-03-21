/* eslint-env browser */

import { hasOwn } from '../../core/utils/object-utils.js';
import { collectObjectMap, collectStat } from './collect-stat.js';
import { renderStat } from './render-stat.js';
import { renderPropertyDetails, renderTypeDetails } from './render-details.js';
import usage from './signature.usage.js';

export default function(host) {
    const elementToData = new WeakMap();
    const clickHandler = ({ target }) => {
        let action = 'expand';
        let activeEl = target.closest(`
            .view-signature .expand,
            .view-signature [data-action]
        `);

        if (!activeEl) {
            return;
        }

        if (activeEl.dataset.action) {
            action = activeEl.dataset.action;
            activeEl = activeEl.parentNode;
        }

        const data = elementToData.get(activeEl);

        if (data) {
            const { context, path, stat, map, offset } = data;
            const fragment = document.createDocumentFragment();

            switch (action) {
                case 'sort-keys':
                    map.sortKeys = !map.sortKeys;
                    break;

                case 'dict-mode':
                    if (map.dictMode) {
                        map.dictMode = null;
                    } else {
                        const dictMode = map.dictMode = {
                            keys: new Set(),
                            count: 0,
                            map: Object.create(null)
                        };
                        map.forEach((_, value) => {
                            for (const key in value) {
                                if (hasOwn(value, key)) {
                                    dictMode.keys.add(key);
                                    dictMode.count++;
                                    collectStat(value[key], 1, dictMode.map);
                                }
                            }
                        });
                    }
                    break;

                default:
                    if (map.properties === null) {
                        map.properties = new Map();
                        map.forEach((_, value) => collectObjectMap(value, 1, map));
                    } else {
                        map.properties = null;
                    }
            }

            renderStat(fragment, { object: map }, elementToData, context, path, offset, stat);
            activeEl.replaceWith(fragment);
        }
    };

    // single event handler for all `signature` view instances
    host.addHostElEventListener('click', clickHandler, false);

    // signature details popup
    new host.view.Popup({
        className: 'signature-details',
        hoverPin: 'trigger-click',
        hoverTriggers: `
            .view-signature .property,
            .view-signature .type
        `,
        render(popupEl, triggerEl) {
            const data = elementToData.get(triggerEl);

            switch (data.type) {
                case 'property':
                    return renderPropertyDetails(popupEl, data, host);

                case 'type':
                    return renderTypeDetails(popupEl, data, host);
            }
        }
    });

    host.view.define('signature', function(el, config, data, context) {
        const { expanded, path } = config;
        const stat = collectStat(data, expanded);
        const normPath = Array.isArray(path) ? path : undefined;
        const rootData = 'rootData' in config
            ? config.rootData
            : !normPath || normPath.length === 0
                ? data
                : undefined;

        renderStat(el, stat, elementToData, { ...context, rootData }, normPath);
    }, {
        usage
    });
}
