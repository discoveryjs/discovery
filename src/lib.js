import { version } from './version.js';
import { Widget, App } from './main/index.js';
import * as views from './views/index.js';
import * as pages from './pages/index.js';
import inspector from './extensions/inspector.js';
import upload from './extensions/upload.js';
import router from './extensions/router.js';
import embed from './extensions/embed-client.js';
import { buttons as navButtons } from './nav/index.js';
import utils from './core/utils/index.js';

export {
    version,
    Widget,
    App,
    views,
    pages,
    inspector,
    upload,
    embed,
    router,
    navButtons,
    utils
};
