/* eslint-env browser */

export default function(discovery) {
    // init
    discovery.setPageHash(location.hash);
    discovery.cancelScheduledRender();

    // sync
    window.addEventListener('hashchange', () => discovery.setPageHash(location.hash), false);
    discovery.on('pageHashChange', function(replace) {
        if (replace) {
            location.replace(discovery.pageHash);
        } else {
            location.hash = discovery.pageHash;
        }
    });
}
