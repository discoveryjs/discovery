/* eslint-env browser */

import { Widget } from './lib.js';
import setup from './gen/setup.js';

const discovery = new Widget(document.body);

document.title = setup.name;
discovery.definePage('default', [
    'h1:#.name',
    {
        view: 'ul',
        data: 'models',
        item: 'link:{ text: name, href: slug + "/" }'
    }
]);

discovery.setData(setup, setup);
