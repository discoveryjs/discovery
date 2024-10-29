/* eslint-env browser */
import type { ViewModel } from '../main/view-model.js';

export default function(host: ViewModel) {
    let preventLocationUpdate = false;

    // init
    host.setPageHash(location.hash);
    host.cancelScheduledRender();

    // register action
    host.action.define('permalink', (hash: string) => new URL(hash, String(location)).href);
    host.action.define('setPreventLocationUpdate', (prevent: boolean = true) => {
        preventLocationUpdate = prevent;
    });

    // sync
    window.addEventListener('hashchange', () => host.setPageHash(location.hash), false);
    host.on('pageHashChange', function(replace) {
        const newPageHash = host.pageHash || '#';

        if (preventLocationUpdate) {
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
