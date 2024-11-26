import { ViewModel } from '../main/view-model.js';

export default (host: ViewModel) => {
    let defaultPageId = '';

    host.nav.remove('index-page');
    host.nav.remove('discovery-page');

    host.on('data', () => {
        if (host.defaultPageId !== host.discoveryPageId) {
            defaultPageId = host.defaultPageId;
            host.defaultPageId = host.discoveryPageId;
            host.setPageHash(host.pageHash, true);
            host.cancelScheduledRender();
        }
    });
    host.on('unloadData', () => {
        if (defaultPageId !== host.defaultPageId) {
            host.defaultPageId = defaultPageId;
            host.setPageHash(host.pageHash, true);
        }
    });
};
