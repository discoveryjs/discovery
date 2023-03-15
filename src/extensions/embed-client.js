import { loadDataFromPush } from '../core/utils/load-data.js';

const navSection = ['primary', 'secondary', 'menu'];
const navAction = new Map([
    ['insert', 0],
    ['prepend', 0],
    ['append', 0],
    ['before', 1],
    ['after', 1],
    ['replace', 1],
    ['remove']
]);

function darkmodeValue({ mode, value }) {
    return mode === 'auto' ? 'auto' : value ? 'dark' : 'light';
}

function randomId() {
    return [
        parseInt(performance.timeOrigin, 10).toString(16),
        parseInt(10000 * performance.now(), 10).toString(16),
        String(Math.random().toString(16).slice(2))
    ].join('-');
}

export default function(host) {
    const hostId = randomId();
    const parentWindow = window.parent;
    const sendMessage = (type, payload = null) => {
        // console.log('[post-message]', type, payload);
        parentWindow.postMessage({
            from: 'discoveryjs-app',
            id: hostId,
            type,
            payload
        }, '*');
    };
    let loadDataApi = null;
    const processIncomingMessage = (event) => {
        const { id, type, payload } = event.data || {};

        if (id === hostId) {
            switch (type) {
                case 'setPageHash': {
                    const { replace, hash } = payload || {};
                    host.setPageHash(hash || '', replace || false);
                    break;
                }

                case 'setPage': {
                    const { replace, id, ref, params } = payload || {};
                    host.setPage(id, ref, params, replace);
                    break;
                }
                case 'setPageRef': {
                    const { replace, ref } = payload || {};
                    host.setPageRef(ref, replace);
                    break;
                }
                case 'setPageParams': {
                    const { replace, params } = payload || {};
                    host.setPageParams(params, replace);
                    break;
                }

                case 'setDarkmode': {
                    const mode = payload;
                    const supportedValues = ['auto', 'light', 'dark'];

                    if (!supportedValues.includes(mode)) {
                        console.warn(`[Discovery.js] Wrong value for darkmode "${mode}", supported values: ${supportedValues.map(value => JSON.stringify(value)).join(', ')}`);
                        break;
                    }

                    host.darkmode.set(mode === 'auto' ? 'auto' : mode === 'dark');

                    break;
                }

                case 'changeNavButtons': {
                    const {
                        section = 'primary',
                        action = 'append',
                        name,
                        position,
                        commands: rawCommands,
                        config: rawConfig
                    } = payload || {};

                    if (!navSection.includes(section)) {
                        console.warn(`[Discovery.js] Wrong value for nav button place "${section}", supported values: ${navSection.map(value => JSON.stringify(value)).join(', ')}`);
                        break;
                    }

                    const commands = rawCommands || {};
                    const config = JSON.parse(JSON.stringify(rawConfig), (key, value) => commands.includes(value)
                        ? () => sendMessage('navMethod', value)
                        : value
                    );

                    switch (action) {
                        case 'insert':
                            host.nav[section].insert(config, position, name);
                            break;

                        case 'prepend':
                        case 'append':
                            host.nav[section][action](config);
                            break;

                        case 'before':
                        case 'after':
                        case 'replace':
                            host.nav[section][action](name, config);
                            break;

                        case 'remove':
                            host.nav[section].remove(name);
                            break;

                        default:
                            console.warn(`[Discovery.js] Wrong value for nav button action "${action}", supported values: ${navAction.map(value => JSON.stringify(value)).join(', ')}`);
                    }

                    break;
                }

                case 'unloadData': {
                    loadDataApi = null;
                    host.unloadData();
                    break;
                }

                case 'startDataLoad': {
                    const { request, size } = payload;

                    loadDataApi = Object.assign(loadDataFromPush(size), { acceptToken: randomId() });
                    sendMessage('readyForDataLoad', { request, acceptToken: loadDataApi.acceptToken });

                    loadDataApi.push('{"data":');

                    if (typeof host.trackLoadDataProgress === 'function') {
                        host.trackLoadDataProgress(loadDataApi);
                    } else {
                        loadDataApi.result.then(({ data, context }) =>
                            host.setData(data, context)
                        );
                    }

                    break;
                }

                case 'dataChunk': {
                    const { acceptToken, value, done } = payload;

                    if (loadDataApi === null) {
                        console.warn('[Discovery.js] Loading data is not inited');
                        break;
                    }

                    if (loadDataApi.acceptToken !== acceptToken) {
                        console.warn('[Discovery.js] Bad accept token');
                        break;
                    }

                    if (value) {
                        loadDataApi.push(value);
                    }

                    if (done) {
                        loadDataApi.push('}');
                        loadDataApi.finish();
                        loadDataApi = null;
                    }

                    break;
                }

                default:
                    console.warn(`[Discovery.js] Got a post-message addressed to discovery app but with unknown "${type}" type`);
            }
        }
    };

    // if no parent then host's document doesn't embeded into another document (e.g. <iframe>)
    if (parentWindow === window) {
        return;
    }

    host.on('pageHashChange', (replace) =>
        sendMessage('pageHashChanged', {
            replace,
            hash: host.pageHash || '#',
            id: host.pageId,
            ref: host.pageRef,
            params: host.pageParams
        })
    );

    host.darkmode.subscribe((value, mode) =>
        sendMessage('darkmodeChanged', {
            mode,
            value: darkmodeValue({ mode, value })
        })
    );

    addEventListener('message', processIncomingMessage, false); // TODO: remove on destroy
    addEventListener('unload', () => sendMessage('destroy'), false); // TODO: send on destroy
    sendMessage('ready', {
        page: {
            hash: host.pageHash || '#',
            id: host.pageId,
            ref: host.pageRef,
            params: host.pageParams
        },
        darkmode: {
            mode: host.darkmode.mode,
            value: darkmodeValue(host.darkmode)
        }
    });
}
