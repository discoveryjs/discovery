import Emitter from './core/emitter.js';
import Publisher from './core/publisher.js';
import { randomId } from './core/utils/id.js';
import { loadStages, decodeStageProgress } from './core/utils/progressbar.js';

const isObject = value => value !== null && typeof value === 'object';
const ReadableStreamDefaultReader = new ReadableStream().getReader().constructor;

export { loadStages, decodeStageProgress };
export function connectToEmbedApp(iframe, onPreinit, onConnect) {
    class BaseApp extends Emitter {
        constructor(window, id) {
            super();

            this.window = window;
            this.id = id;

            this.publicApi = Object.freeze({});
        }
        sendMessage(type, payload) {
            this.window.postMessage({
                id: this.id,
                type,
                payload: payload || null
            }, '*');
        }
        destroy() {
            this.window = null;
            this.sendMessage = () => {};
        }
    }
    class EmbedPreinitApp extends BaseApp {
        constructor(window, id) {
            super(window, id);

            this.publicApi = Object.freeze({
                on: this.on.bind(this),
                once: this.once.bind(this),
                off: this.off.bind(this)
            });
        }
        processMessage(message) {
            switch (message.type) {
                case 'loadingState': {
                    this.emit('loadingStateChanged', message.payload);
                    break;
                }
            }
        }
    }
    class EmbedApp extends BaseApp {
        constructor(window, id) {
            super(window, id);

            this.commandMap = new Map();
            this.requestDataLoadToken = undefined;
            this.requestDataLoader = undefined;
            this.pageHash = new Publisher('');
            this.pageId = new Publisher('');
            this.pageRef = new Publisher('');
            this.pageParams = new Publisher({});
            this.darkmode = new Publisher({ mode: 'unknown', value: 'unknown' },
                (prev, next) => prev.mode !== next.mode || prev.value !== next.value
            );

            const nav = {
                primary: createNavSection('primary', this.sendMessage.bind(this), this.commandMap),
                secondary: createNavSection('secondary', this.sendMessage.bind(this), this.commandMap),
                menu: createNavSection('menu', this.sendMessage.bind(this), this.commandMap)
            };

            this.publicApi = Object.freeze({
                pageHash: this.pageHash.readonly,
                pageId: this.pageId.readonly,
                pageRef: this.pageRef.readonly,
                pageParams: this.pageParams.readonly,
                darkmode: this.darkmode.readonly,

                on: this.on.bind(this),
                once: this.once.bind(this),
                off: this.off.bind(this),

                nav: Object.assign(nav.secondary, nav),

                setPageHash: (hash, replace) => {
                    this.sendMessage('setPageHash', { hash, replace });
                },
                setPage: (id, ref, params, replace) => {
                    this.sendMessage('setPage', { id, ref, params, replace });
                },
                setPageRef: (ref, replace) => {
                    this.sendMessage('setPageRef', { ref, replace });
                },
                setPageParams: (params, replace) => {
                    this.sendMessage('setPageParams', { params, replace });
                },
                setDarkmode: (value) => {
                    this.sendMessage('setDarkmode', value);
                },
                unloadData: () => {
                    this.sendMessage('unloadData');
                },
                loadData: (dataLoader) => {
                    this.requestDataLoadToken = randomId();
                    this.requestDataLoader = dataLoader;
                    this.sendMessage('startDataLoad', { request: this.requestDataLoadToken });
                }
            });
        }
        async processMessage(message) {
            switch (message.type) {
                case 'destroy': {
                    resetIfNeeded();
                    break;
                }

                case 'navMethod': {
                    // console.log('navMethod', data);
                    const fn = this.commandMap.get(message.payload);

                    if (typeof fn === 'function') {
                        fn();
                    } else {
                        console.warn(`Nav command "${message.payload}" was not found`);
                    }

                    break;
                }

                case 'pageHashChanged': {
                    const { replace, hash, id, ref, params } = message.payload || {};

                    this.pageHash.set(hash);
                    this.pageId.set(id);
                    this.pageRef.set(ref);
                    this.pageParams.set(params);
                    this.emit('pageHashChanged', hash, replace);

                    break;
                }

                case 'darkmodeChanged': {
                    const value = message.payload;

                    this.darkmode.set(value);
                    this.emit('darkmodeChanged', value);

                    break;
                }

                case 'unloadData': {
                    this.emit('unloadData');
                    break;
                }

                case 'data': {
                    this.emit('data');
                    break;
                }

                case 'loadingState': {
                    this.emit('loadingStateChanged', message.payload);
                    break;
                }

                case 'readyForDataLoad': {
                    const requestDataLoadToken = this.requestDataLoadToken;
                    const { request, acceptToken } = message.payload;

                    if (request === this.requestDataLoadToken) {
                        if (typeof this.requestDataLoader === 'function') {
                            const shouldStop = () => this?.requestDataLoadToken !== requestDataLoadToken;
                            let source = await this.requestDataLoader();

                            if (shouldStop()) {
                                return;
                            }

                            if (typeof source === 'string') {
                                source = [source];
                            } else if (source instanceof Response) {
                                source = source.body.getReader();
                            } else if (source instanceof ReadableStream) {
                                source = source.getReader();
                            }

                            if (source instanceof ReadableStreamDefaultReader) {
                                while (true) {
                                    // await new Promise(resolve => setTimeout(resolve, 1000));
                                    const { value, done } = await source.read();

                                    this.sendMessage('dataChunk', { acceptToken, value, done }, [value?.buffer]);

                                    if (done || shouldStop()) {
                                        source.cancel();
                                        source.releaseLock();
                                        break;
                                    }
                                }

                                break;
                            } else if (isObject(source) && (Symbol.iterator in source || Symbol.asyncIterator in source)) {
                                for await (const value of source) {
                                    if (shouldStop()) {
                                        return;
                                    }

                                    this.sendMessage('dataChunk', { acceptToken, value });
                                }

                                if (shouldStop()) {
                                    return;
                                }

                                this.sendMessage('dataChunk', { acceptToken, done: true });

                                break;
                            }
                        }

                        throw new Error(
                            'Chunk emitter should be generator, async generator or function returning an iterable object'
                        );
                    }

                    break;
                }

                default:
                    console.error(`[Discovery.js] Unknown embed message type "${message.type}"`);
            }
        }
        destroy() {
            super.destroy();
            this.requestDataLoadToken = undefined;
            this.requestDataLoader = undefined;
        }
    }

    let embedApp = null;
    let onDisconnect = null;

    if (typeof onConnect !== 'function') {
        onConnect = onPreinit;
        onPreinit = null;
    }

    addEventListener('message', handleIncomingMessages);

    return () => {
        removeEventListener('message', handleIncomingMessages);
        resetIfNeeded();
    };

    function resetIfNeeded() {
        if (embedApp !== null) {
            embedApp.destroy();

            if (typeof onDisconnect === 'function') {
                onDisconnect();
            }

            embedApp = null;
            onDisconnect = null;
        }
    }

    async function handleIncomingMessages(e) {
        const data = e.data || {};

        // Event "source" will be null in case message was sent on page unload
        if (e.isTrusted && (e.source === iframe.contentWindow || e.source === null) && data.from === 'discoveryjs-app') {
            if (data.type === 'ready') {
                resetIfNeeded();

                embedApp = new EmbedApp(iframe.contentWindow, data.id);
                embedApp.pageHash.set(data.payload.page.hash);
                embedApp.pageId.set(data.payload.page.id);
                embedApp.pageRef.set(data.payload.page.ref);
                embedApp.pageParams.set(data.payload.page.params);
                embedApp.darkmode.set(data.payload.darkmode);

                onDisconnect = onConnect(embedApp.publicApi);

                return;
            }

            if (data.type === 'preinit') {
                resetIfNeeded();

                if (typeof onPreinit === 'function') {
                    embedApp = new EmbedPreinitApp(iframe.contentWindow, data.id);
                    onDisconnect = onPreinit(embedApp.publicApi);
                }

                return;
            }

            if (embedApp?.id === data.id) {
                embedApp.processMessage(data);
                return;
            }
        }
    }
}

function createNavSection(section, sendMessage, commandMap) {
    function prepareConfig(config) {
        const commands = [];

        return {
            commands,
            config: JSON.parse(JSON.stringify(config, (key, value) => {
                if (typeof value === 'function') {
                    const id = 'nav-command-' + randomId();
                    commands.push(id);
                    commandMap.set(id, value);
                    return id;
                }

                return value;
            }))
        };
    }

    return {
        insert(config, position, name) {
            sendMessage('changeNavButtons', { section, action: 'insert', name, position, ...prepareConfig(config) });
        },
        prepend(config) {
            sendMessage('changeNavButtons', { section, action: 'prepend', ...prepareConfig(config) });
        },
        append(config) {
            sendMessage('changeNavButtons', { section, action: 'append', ...prepareConfig(config) });
        },
        before(name, config) {
            sendMessage('changeNavButtons', { section, action: 'before', name, ...prepareConfig(config) });
        },
        after(name, config) {
            sendMessage('changeNavButtons', { section, action: 'after', name, ...prepareConfig(config) });
        },
        replace(name, config) {
            sendMessage('changeNavButtons', { section, action: 'replace', name, ...prepareConfig(config) });
        },
        remove(name) {
            sendMessage('changeNavButtons', { section, action: 'remove', name });
        }
    };
}
