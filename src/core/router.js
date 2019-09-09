/* eslint-env browser */

export default function(discovery) {
    // init
    discovery.setPageHash(location.hash);
    discovery.cancelScheduledRender();

    // sync
    window.addEventListener('hashchange', () => discovery.setPageHash(location.hash), false);
    discovery.on('pageHashChange', function(replace) {
        const newPageHash = discovery.pageHash || '#';

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
