import Emitter from './core/emitter.js';
import Publisher from './core/publisher.js';

const isObject = value => value !== null && typeof value === 'object';
const ReadableStreamDefaultReader = new ReadableStream().getReader().constructor;

export function connectToEmbedApp(iframe, onConnect) {
    class EmbedApp extends Emitter {
        constructor(window, id) {
            super();

            this.window = window;
            this.id = id;

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
                    this.requestDataLoadToken = genID();
                    this.requestDataLoader = dataLoader;
                    this.sendMessage('startDataLoad', { request: this.requestDataLoadToken });
                }
            });
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
            this.requestDataLoadToken = undefined;
            this.requestDataLoader = undefined;
            this.sendMessage = () => {};
        }
    }

    let embedApp = null;
    let onDisconnect = null;

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

            if (embedApp === null || embedApp.id !== data.id) {
                return;
            }

            switch (data.type) {
                case 'destroy': {
                    resetIfNeeded();
                    break;
                }

                case 'navMethod': {
                    // console.log('navMethod', data);
                    const fn = embedApp.commandMap.get(data.payload);

                    if (typeof fn === 'function') {
                        fn();
                    } else {
                        console.warn(`Nav command "${data.payload}" was not found`);
                    }

                    break;
                }

                case 'pageHashChanged': {
                    const { replace, hash, id, ref, params } = data.payload || {};

                    embedApp.pageHash.set(hash);
                    embedApp.pageId.set(id);
                    embedApp.pageRef.set(ref);
                    embedApp.pageParams.set(params);
                    embedApp.emit('pageHashChanged', hash, replace);

                    break;
                }

                case 'darkmodeChanged': {
                    const value = data.payload;

                    embedApp.darkmode.set(value);
                    embedApp.emit('darkmodeChanged', value);

                    break;
                }

                case 'readyForDataLoad': {
                    const requestDataLoadToken = embedApp.requestDataLoadToken;
                    const { request, acceptToken } = data.payload;

                    if (request === embedApp.requestDataLoadToken) {
                        if (typeof embedApp.requestDataLoader === 'function') {
                            const shouldStop = () => embedApp?.requestDataLoadToken !== requestDataLoadToken;
                            let source = await embedApp.requestDataLoader();

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

                                    embedApp.sendMessage('dataChunk', { acceptToken, value, done }, [value?.buffer]);

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

                                    embedApp.sendMessage('dataChunk', { acceptToken, value });
                                }

                                if (shouldStop()) {
                                    return;
                                }

                                embedApp.sendMessage('dataChunk', { acceptToken, done: true });

                                break;
                            }
                        }

                        throw new Error(
                            'Chunk emitter should be generator, async generator or function returning an iterable object'
                        );
                    }

                    break;
                }
            }
        }
    }
}

function genID() {
    return String(Math.random().toString(16).slice(2));
}

function createNavSection(section, sendMessage, commandMap) {
    function prepareConfig(config) {
        const commands = [];

        return {
            commands,
            config: JSON.parse(JSON.stringify(config, (key, value) => {
                if (typeof value === 'function') {
                    const id = 'nav-command-' + genID();
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
