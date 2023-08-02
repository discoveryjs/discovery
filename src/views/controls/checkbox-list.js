/* eslint-env browser */
import usage from './checkbox-list.usage.js';

export default function(host) {
    host.view.define('checkbox-list', function(el, config, data, context) {
        const { name = 'filter', checkbox, checkboxValue = '$', emptyText, limit, onChange, onInit } = config;
        const state = new Set();

        if (emptyText !== false && emptyText !== '') {
            el.setAttribute('emptyText', emptyText || 'Empty list');
        }

        if (!Array.isArray(data) && data) {
            data = [data];
        }

        if (Array.isArray(data)) {
            return host.view.renderList(el, this.composeConfig({
                view: 'checkbox',
                ...checkbox,
                onInit: (checked, _, itemData, itemContext) => {
                    if (checked) {
                        state.add(host.query(checkboxValue, itemData, itemContext));
                    }
                },
                onChange: (checked, _, itemData, itemContext) => {
                    const size = state.size;
                    const value = host.query(checkboxValue, itemData, itemContext);

                    if (checked) {
                        state.add(value);
                    } else {
                        state.delete(value);
                    }

                    if (size !== state.size && typeof onChange === 'function') {
                        onChange([...state], name);
                    }
                }
            }), data, context, 0, host.view.listLimit(limit, 25)).then(() => {
                if (typeof onInit === 'function') {
                    onInit([...state], name);
                }
            });
        }
    }, { usage });
};
