import { ViewModel } from '../main/view-model.js';

export default (host: ViewModel) => {
    let defaultPageId = '';

    host.nav.primary.append({
        name: 'github',
        href: 'https://github.com/discoveryjs/discovery',
        external: true
    });
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
            host.defaultPageId = defaultPageId as string;
            host.setPageHash(host.pageHash, true);
            host.cancelScheduledRender();
        }
    });
};
