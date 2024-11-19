import type { ViewModel } from '../main/view-model.js';
import type { App } from '../main/app.js';
import type { NavItemConfig } from '../nav/index.js';
import type { EmbedClientToHostMessage, EmbedHostToClientMessage, EmbedHostToClientPostponeMessage } from './embed-message.types.js';
import type { LoadDataFromPush } from '../core/utils/load-data.js';
import type { Mode } from '../core/darkmode.js';
import { randomId } from '../core/utils/id.js';
import { loadDataFromPush, loadDataFromStream } from '../core/utils/load-data.js';

export type EmbedClientOptions = {
    hostId: string;
    postponeMessages: EmbedHostToClientPostponeMessage[];
};

export type LoadDataChunkedStatus = LoadDataFromPush & {
    acceptToken: string;
};

export type SendMessage = <T extends EmbedClientToHostMessage['type']>(
    type: T,
    payload: Extract<EmbedClientToHostMessage, { type: T }>['payload']
) => void;

// export an integration with default settings
export default Object.assign(setup(), { setup });

const noop = () => {};
const navSection = ['primary', 'secondary', 'menu'];
const navAction = ['insert', 'prepend', 'append', 'before', 'after', 'replace', 'remove'];

function darkmodeValue({ mode, value }: { mode: Mode, value: boolean }) {
    return mode === 'auto' ? 'auto' : value ? 'dark' : 'light';
}

function createNavItemConfig(rawConfig: unknown, sendMessage: SendMessage, rawCommands?: string[]): NavItemConfig {
    const commands: string[] = Array.isArray(rawCommands) ? rawCommands : [];
    return JSON.parse(JSON.stringify(rawConfig), (_, value: unknown) =>
        typeof value === 'string' && commands.includes(value)
            ? () => sendMessage('navMethod', value)
            : value
    );
}

function setup(options?: Partial<EmbedClientOptions>) {
    const hostId = options?.hostId || randomId();
    const postponeMessages = options?.postponeMessages;

    return function(host: ViewModel) {
        let loadChunkedDataStatus: LoadDataChunkedStatus | null = null;
        let loadDataUnsubscribe = noop;
        const cancelLoadChunkedDataApi = (error?: unknown) => {
            loadChunkedDataStatus?.finish();
            loadChunkedDataStatus = null;

            if (error) {
                host.log('debug', 'Cancel chunked data load from host with error:', error);
            }
        };
        const parentWindow = window.parent;
        const actionCalls = new Map();
        const sendMessage: SendMessage = (type, payload) => {
            const message: EmbedClientToHostMessage = {
                from: 'discoveryjs-app',
                id: hostId,
                type,
                payload
            } as EmbedClientToHostMessage;

            parentWindow.postMessage(message, '*');
        };
        const setLoadDataUnsubscribe = (fn: () => void) => {
            loadDataUnsubscribe = () => {
                if (fn !== null) {
                    loadDataUnsubscribe = noop;
                    fn();
                }
            };
        };
        const trackDataLoading = (loadDataStatus: ReturnType<typeof loadDataFromStream>) => {
            const result = typeof host.trackLoadDataProgress === 'function'
                ? host.trackLoadDataProgress(loadDataStatus)
                : loadDataStatus.dataset
                    .then(dataset => host.setData(dataset.data, null, { dataset }));

            // do nothing
            result.catch(() => {});
        };
        const processIncomingMessage = ({ data }: { data: EmbedHostToClientMessage }) => {
            const { id, type, payload } = data || {};

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
                        const { callId } = payload;

                        if (!actionCalls.has(callId)) {
                            host.log('error', `[Discovery.js] Unknown action call id "${callId}"`);
                            break;
                        }

                        const { resolve, reject } = actionCalls.get(callId);

                        if ('error' in payload) {
                            reject(payload.error);
                        } else {
                            resolve(payload.value);
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
                            action = 'unknown'
                        } = payload;

                        if (!navSection.includes(section)) {
                            host.log('warn', `Wrong value for nav button place "${section}", supported values: ${navSection.map(value => JSON.stringify(value)).join(', ')}`);
                            break;
                        }

                        switch (payload.action) {
                            case 'insert': {
                                const { name, position, config, commands } = payload;
                                host.nav[section].insert(createNavItemConfig(config, sendMessage, commands), position, name);
                                break;
                            }

                            case 'prepend':
                            case 'append': {
                                const { config, commands } = payload;
                                host.nav[section][payload.action](createNavItemConfig(config, sendMessage, commands));
                                break;
                            }

                            case 'before':
                            case 'after':
                            case 'replace': {
                                const { name, config, commands } = payload;
                                host.nav[section][payload.action](name, createNavItemConfig(config, sendMessage, commands));
                                break;
                            }

                            case 'remove': {
                                const { name } = payload;
                                host.nav[section].remove(name);
                                break;
                            }

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
                        const { acceptToken } = payload;

                        if (loadChunkedDataStatus === null) {
                            host.log('warn', 'Loading data is not inited');
                            break;
                        }

                        if (loadChunkedDataStatus.acceptToken !== acceptToken) {
                            host.log('warn', 'Bad accept token');
                            break;
                        }

                        if ('value' in payload && payload.value !== undefined) {
                            loadChunkedDataStatus.push(payload.value);
                        }

                        if ('done' in payload && payload.done) {
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
        host.on('pageHashChange', (replace) => {
            sendMessage('pageHashChanged', {
                replace,
                hash: host.pageHash || '#',
                id: host.pageId,
                ref: host.pageRef,
                params: host.pageParams
            });
        });

        (host as App).on('startLoadData', (subscribe) => {
            loadDataUnsubscribe();
            setLoadDataUnsubscribe(subscribe(state => sendMessage('loadingState', state)));
        });

        host.on('startSetData', (subscribe) => {
            loadDataUnsubscribe();
            setLoadDataUnsubscribe(subscribe(state => sendMessage('loadingState', state)));
        });

        host.on('data', () => {
            sendMessage('data', null);
        });

        host.on('unloadData', () => {
            loadDataUnsubscribe();
            sendMessage('unloadData', null);
        });

        host.darkmode.subscribe((value, mode) =>
            sendMessage('darkmodeChanged', {
                mode,
                value: darkmodeValue({ mode, value })
            })
        );

        // apply captured messages if any
        if (Array.isArray(postponeMessages)) {
            Promise.resolve().then(() => {
                for (const message of postponeMessages) {
                    processIncomingMessage({ data: message });
                }
            });
        }

        // main life cycle handlers
        addEventListener('message', processIncomingMessage, false); // TODO: remove on destroy
        addEventListener('unload', () => sendMessage('destroy', null), false); // TODO: send on destroy
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
