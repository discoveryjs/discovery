/* eslint-env browser */

export default function(host) {
    // init
    host.setPageHash(location.hash);
    host.cancelScheduledRender();

    // register action
    host.action.define('permalink', (hash) => new URL(hash, location).href);

    // sync
    window.addEventListener('hashchange', () => host.setPageHash(location.hash), false);
    host.on('pageHashChange', function(replace) {
        const newPageHash = host.pageHash || '#';

        if (host.routerPreventLocationUpdate) {
            return;
        }

        if (newPageHash === '#' && !location.hash) {
            return;
        }

        if (replace) {
            location.replace(newPageHash);
        } else {
            location.hash = newPageHash;
        }
    });
}
