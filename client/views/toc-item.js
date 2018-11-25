/* eslint-env browser */

export default function(discovery) {
    discovery.view.define('toc-item', [
        {
            view: 'link',
            data: '{ href, text: caption, match }',
            content: 'text-match'
        },
        {
            view: 'pill-badge',
            className: 'item-error-label',
            when: 'errors',
            data: '{ text: errors.size() }'
        }
    ]);
}
