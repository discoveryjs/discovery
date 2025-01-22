import modelfree from './src/extensions/modelfree.js';
import upload from './src/extensions/upload.js';
import * as navButtons from './src/nav/buttons.js';

discovery.apply([
    modelfree,
    upload.setup({ clipboard: true }),
    navButtons.uploadFile,
    navButtons.uploadFromClipboard,
    navButtons.unloadData
]);

discovery.nav.primary.append({
    name: 'github',
    text: '',
    href: 'https://github.com/discoveryjs/discovery',
    external: true
});
