import { version } from './version.js';
import { Model, ViewModel, App } from './main/index.js';
import * as views from './views/index.js';
import * as pages from './pages/index.js';
import inspector from './extensions/inspector.js';
import upload from './extensions/upload.js';
import router from './extensions/router.js';
import embed from './extensions/embed-client.js';
import { buttons as navButtons } from './nav/index.js';
import jsonxl from './core/encodings/jsonxl.js';
import utils from './core/utils/index.js';

export type * from './main/index.js';
export {
    version,
    Model,
    ViewModel,
    ViewModel as Widget, // for backward compatibility
    App,
    views,
    pages,
    embed,
    inspector,
    jsonxl,
    router,
    upload,
    navButtons,
    utils
};
