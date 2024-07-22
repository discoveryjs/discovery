import { randomId } from '../core/utils/id.js';
import { loadDataFromPush, loadDataFromStream } from '../core/utils/load-data.js';

// export an integration with default settings
export default Object.assign(setup(), { setup });

const noop = () => {};
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

function setup(options) {
    options = options || {};

    return function(host) {
        let loadChunkedDataStatus = null;
        let loadDataUnsubscribe = noop;
        const cancelLoadChunkedDataApi = () => {
            loadChunkedDataStatus?.finish();
            loadChunkedDataStatus = null;
        };
        const hostId = options.hostId || randomId();
        const parentWindow = window.parent;
        const actionCalls = new Map();
        const sendMessage = (type, payload = null) => {
            parentWindow.postMessage({
                from: 'discoveryjs-app',
                id: hostId,
                type,
                payload
            }, '*');
        };
        const setLoadDataUnsubscribe = (fn) => {
            loadDataUnsubscribe = () => {
                if (fn !== null) {
                    loadDataUnsubscribe = noop;
                    fn();
                }
            };
        };
        const trackDataLoading = (loadDataStatus) => {
            const result = typeof host.trackLoadDataProgress === 'function'
                ? host.trackLoadDataProgress(loadDataStatus)
                : loadDataStatus.dataset
                    .then(dataset => host.setData(dataset.data, null, { dataset }));

            // do nothing
            result.catch(() => {});
        };
        const processIncomingMessage = (event) => {
            const { id, type, payload } = event.data || {};

            if (id === hostId) {
                switch (type) {
                    case 'defineAction': {
                        const name = payload;
                        host.action.define(name, (...args) =>
                            new Promise((resolve, reject) => {
                                const callId = randomId();
                                actionCalls.set(callId, { resolve, reject });
                                setTimeout(() => {
                                    actionCalls.delete(callId);
                                    reject(new Error('Timeout'));
                                }, 30_000);
                                sendMessage('action', {
                                    callId,
                                    name,
                                    args
                                });
                            })
                        );
                        break;
                    }
                    case 'actionResult': {
                        const { callId, value, error } = payload;

                        if (!actionCalls.has(callId)) {
                            host.log('error', `[Discovery.js] Unknown action call id "${callId}"`);
                            break;
                        }

                        const { resolve, reject } = actionCalls.get(callId);

                        if (error) {
                            reject(error);
                        } else {
                            resolve(value);
                        }
                        break;
                    }

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
                            host.log('warn', `Wrong value for darkmode "${mode}", supported values: ${supportedValues.map(value => JSON.stringify(value)).join(', ')}`);
                            break;
                        }

                        host.darkmode.set(mode === 'auto' ? 'auto' : mode === 'dark');

                        break;
                    }

                    case 'setRouterPreventLocationUpdate': {
                        host.action.call('setPreventLocationUpdate', Boolean(payload));
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
                            host.log('warn', `Wrong value for nav button place "${section}", supported values: ${navSection.map(value => JSON.stringify(value)).join(', ')}`);
                            break;
                        }

                        const commands = rawCommands || {};
                        const config = JSON.parse(JSON.stringify(rawConfig), (_, value) => commands.includes(value)
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
                                host.log('warn', `Wrong value for nav button action "${action}", supported values: ${navAction.map(value => JSON.stringify(value)).join(', ')}`);
                        }

                        break;
                    }

                    case 'unloadData': {
                        cancelLoadChunkedDataApi();
                        host.unloadData();
                        break;
                    }

                    case 'dataStream': {
                        const { stream, resource } = payload;

                        cancelLoadChunkedDataApi();
                        trackDataLoading(loadDataFromStream(stream, { resource }));

                        break;
                    }

                    case 'startChunkedDataUpload': {
                        const { acceptToken, resource } = payload;

                        cancelLoadChunkedDataApi();
                        loadChunkedDataStatus = Object.assign(loadDataFromPush({ resource }), { acceptToken });

                        trackDataLoading(loadChunkedDataStatus);

                        break;
                    }

                    case 'cancelChunkedDataUpload': {
                        const { acceptToken, error } = payload;

                        if (loadChunkedDataStatus?.acceptToken === acceptToken) {
                            cancelLoadChunkedDataApi(error);
                        }
                    }

                    case 'dataChunk': {
                        const { acceptToken, value, done } = payload;

                        if (loadChunkedDataStatus === null) {
                            host.log('warn', 'Loading data is not inited');
                            break;
                        }

                        if (loadChunkedDataStatus.acceptToken !== acceptToken) {
                            host.log('warn', 'Bad accept token');
                            break;
                        }

                        if (value) {
                            loadChunkedDataStatus.push(value);
                        }

                        if (done) {
                            cancelLoadChunkedDataApi();
                        }

                        break;
                    }

                    default:
                        host.log('warn', `Got a post-message addressed to discovery app but with unknown "${type}" type`);
                }
            }
        };

        // if no parent then host's document doesn't embedded into another document (e.g. <iframe>)
        if (parentWindow === window) {
            return;
        }

        // bind to app's state changes
        host.on('pageHashChange', (replace) =>
            sendMessage('pageHashChanged', {
                replace,
                hash: host.pageHash || '#',
                id: host.pageId,
                ref: host.pageRef,
                params: host.pageParams
            })
        );

        host.on('startLoadData', (subscribe) => {
            loadDataUnsubscribe();
            setLoadDataUnsubscribe(subscribe(state => sendMessage('loadingState', state)));
        });

        host.on('startSetData', (subscribe) => {
            loadDataUnsubscribe();
            setLoadDataUnsubscribe(subscribe(state => sendMessage('loadingState', state)));
        });

        host.on('unloadData', () => {
            loadDataUnsubscribe();
            sendMessage('unloadData');
        });

        host.on('data', () => {
            sendMessage('data');
        });

        host.darkmode.subscribe((value, mode) =>
            sendMessage('darkmodeChanged', {
                mode,
                value: darkmodeValue({ mode, value })
            })
        );

        // apply captured messages if any
        if (options.postponeMessages) {
            Promise.resolve().then(() => {
                for (let message of options.postponeMessages) {
                    processIncomingMessage({ data: message });
                }
            });
        }

        // main life cycle handlers
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
    };
}
