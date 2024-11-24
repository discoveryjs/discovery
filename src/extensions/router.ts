/* eslint-env browser */
import type { ViewModel } from '../main/view-model.js';
import type { LocationSync } from '../core/utils/location-sync.js';
import { createLocationSync } from '../core/utils/location-sync.js';

export default function(host: ViewModel) {
    function createHostLocationSync() {
        return createLocationSync(hash => host.setPageHash(hash), host.logger);
    }

    let locationSync: LocationSync | null = createHostLocationSync();

    // init
    host.setPageHash(location.hash);
    host.cancelScheduledRender();

    // register action
    host.action.define('permalink', (hash: string) => new URL(hash, String(location)).href);
    host.action.define('setPreventLocationUpdate', (prevent: boolean = true) => {
        if (prevent) {
            locationSync?.dispose();
            locationSync = null;
        } else if (locationSync === null) {
            locationSync = createHostLocationSync();
        }
    });

    // sync
    host.on('pageHashChange', (replace) => locationSync?.set(host.pageHash, replace));
}
