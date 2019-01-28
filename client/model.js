/* eslint-env browser */

import { App } from '../lib.js';
import setup from './gen/setup.js';                // generated file
import modelPrepare from './gen/model-prepare.js'; // generated file (model specific)
import modelView from './gen/model-view.js';       // generated file (model specific)

const discovery = new App(document.body,
    setup.model
        ? { mode: setup.mode, cache: setup.model.cache }
        : { mode: 'modelfree' }
);

discovery.apply([modelView, modelPrepare]);

if (discovery.mode !== 'modelfree') {
    discovery.loadDataFromUrl('./data.json', 'data');
} else {
    discovery.renderPage();
}
