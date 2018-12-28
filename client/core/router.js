/* eslint-env browser */

function decodeParams() {
    const hash = location.hash.substr(1);
    const parts = hash.split('&');
    const [page, id] = (parts.shift() || '').split(':');
    const params = [...new URLSearchParams(parts.join('&'))].reduce((map, [key, value]) => {
        map[key] = value || true;
        return map;
    }, {});

    return {
        page,
        id,
        params
    };
}

function encodeParams(params) {
    return new URLSearchParams(params).toString();
}

function self(value) {
    return value;
}

export default function(discovery) {
    function updatePageFromHash() {
        const dp = decodeParams();

        discovery.pageId = dp.page || 'default';
        discovery.pageRef = dp.id;
        discovery.pageParams = discovery.getPageOption('decodeParams', self)(dp.params);
    }

    discovery.setPageParams = function(params, replace) {
        const newParams = this.getPageOption('encodeParams', encodeParams)(params || {});

        const curLocation = location.hash || '#';
        const newLocation = `#${this.pageId !== 'default' ? this.pageId : ''}${this.pageRef ? ':' + this.pageRef : ''}${newParams ? '&' + newParams : ''}`;

        if (newLocation !== curLocation) {
            this.pageParams = params || {};
            if (replace) {
                location.replace(newLocation);
            } else {
                location.hash = newLocation;
            }
            return true;
        }
    };

    updatePageFromHash();
    window.addEventListener('hashchange', () => {
        updatePageFromHash();
        discovery.renderPage();
    }, false);
}
