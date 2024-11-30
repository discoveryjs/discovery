import type { PageParams, PageRef } from '../main/model.js';
import type { EmbedClientToHostMessage, EmbedHostToClientMessage, EmbedHostToPreinitMessage, EmbedPreinitToHostMessage, NavInsertPosition, NavSection } from './embed-message.types.js';
import type { NavItemConfig } from '../nav/index.js';
import type { LoadDataState } from '../core/utils/load-data.js';
import type { ProgressbarState } from '../core/utils/progressbar.js';
import type { ColorSchemeState, SerializedColorSchemeValue } from '../core/color-scheme.js';
import { Emitter } from '../core/emitter.js';
import { Observer } from '../core/observer.js';
import { randomId } from '../core/utils/id.js';
import { extractResourceMetadata, getReadableStreamFromSource } from '../core/utils/load-data.js';
import { loadStages, decodeStageProgress } from '../core/utils/progressbar.js';
import { createLocationSync, LocationSync } from '../core/utils/location-sync.js';

export type BaseAppEvents = {
    destroy: [];
};
export interface EmbedPreinitAppEvents extends BaseAppEvents {
    loadingStateChanged: [state: LoadDataState];
};
export interface EmbedAppEvents extends BaseAppEvents {
    colorSchemeChanged: [value: {
        state: ColorSchemeState;
        value: SerializedColorSchemeValue;
    }];
    loadingStateChanged: [state: ProgressbarState];
    pageHashChanged: [hash: string, replace: boolean];
    unloadData: [];
    data: [];
};
export type onDisconnectCallback = () => void;
export type onPreinitCallback = (api: typeof EmbedPreinitApp.prototype.publicApi) => onDisconnectCallback | void;
export type onConnectCallback = (api: typeof EmbedApp.prototype.publicApi) => onDisconnectCallback | void;
export type ActionsMap = Map<string, (...args: unknown[]) => unknown>;

const logPrefix = '[Discovery/embed-host]';
const noop = () => {};
const isStreamTransferable = (() => {
    try {
        const stream = new ReadableStream();
        new MessageChannel().port1.postMessage(stream, [stream]);
        return true;
    } catch {
        return false;
    }
})();

class BaseApp<
    Message extends EmbedHostToPreinitMessage | EmbedHostToClientMessage,
    Events extends BaseAppEvents = BaseAppEvents
> extends Emitter<Events> {
    window: Window;
    id: string;
    actions: ActionsMap;
    dataLoadToken: string | null;

    constructor(window: Window, id: string, actions: ActionsMap) {
        super();

        this.window = window;
        this.id = id;
        this.actions = actions;
        this.dataLoadToken = null;
    }
    sendMessage<T extends Message['type']>(
        type: T,
        payload: Extract<Message, { type: T }>['payload'],
        transfer?: Transferable[]
    ) {
        const message: Message = {
            id: this.id,
            from: 'discoveryjs-app',
            type,
            payload: payload || null
        } as Message;

        this.window.postMessage(message, '*', transfer);
    }
    destroy() {
        this.destroy = noop;
        this.emit('destroy');
        this.dataLoadToken = null;
        this.window = null as unknown as Window;
        this.sendMessage = noop;
    }
}

class EmbedPreinitApp extends BaseApp<EmbedHostToPreinitMessage, EmbedPreinitAppEvents> {
    publicApi: ReturnType<typeof EmbedPreinitApp.createPublicApi>;

    static createPublicApi(app: EmbedPreinitApp) {
        return Object.freeze({
            // FIXME: TS should infer types for on/once/off, however it doesn't
            // and produces `any` instead. Used `as EmbedPreinitApp[method]` as a workaround.
            on: app.on.bind(app) as EmbedPreinitApp['on'],
            once: app.once.bind(app) as EmbedPreinitApp['once'],
            off: app.off.bind(app) as EmbedPreinitApp['off'],

            defineAction(name: string, fn: (...args: unknown[]) => unknown) {
                app.actions.set(name, fn);
                app.sendMessage('defineAction', name);
            },

            setPageHash(hash: string, replace = false) {
                app.sendMessage('setPageHash', { hash, replace });
            },

            setRouterPreventLocationUpdate(allow = true) {
                app.sendMessage('setRouterPreventLocationUpdate', allow);
            }
        });
    }

    constructor(window: Window, id: string, actions: ActionsMap) {
        super(window, id, actions);

        this.publicApi = EmbedPreinitApp.createPublicApi(this);
    }

    processMessage(message: EmbedPreinitToHostMessage) {
        switch (message.type) {
            case 'loadingState': {
                this.emit('loadingStateChanged', message.payload);
                break;
            }
        }
    }
}

class EmbedApp extends BaseApp<EmbedHostToClientMessage, EmbedAppEvents> {
    commandMap: Map<string, (...args: unknown[]) => unknown>;
    dataLoadToken: string | null;

    pageHash: Observer<string>;
    pageId: Observer<string>;
    pageRef: Observer<PageRef>;
    pageParams: Observer<PageParams>;
    locationSync: LocationSync | null;
    colorScheme: Observer<{
        state: ColorSchemeState | 'unknown';
        value: SerializedColorSchemeValue | 'unknown';
    }>;
    publicApi: ReturnType<typeof EmbedApp.createPublicApi>;

    static createPublicApi(app: EmbedApp) {
        const nav = {
            primary: createNavSection('primary', app.sendMessage.bind(app), app.commandMap),
            secondary: createNavSection('secondary', app.sendMessage.bind(app), app.commandMap),
            menu: createNavSection('menu', app.sendMessage.bind(app), app.commandMap)
        };

        return Object.freeze({
            pageHash: app.pageHash.readonly,
            pageId: app.pageId.readonly,
            pageRef: app.pageRef.readonly,
            pageParams: app.pageParams.readonly,
            colorScheme: app.colorScheme.readonly,

            // FIXME: TS should infer types for on/once/off, however it doesn't
            // and produces `any` instead. Used `as EmbedApp[method]` as a workaround.
            on: app.on.bind(app) as EmbedApp['on'],
            once: app.once.bind(app) as EmbedApp['once'],
            off: app.off.bind(app) as EmbedApp['off'],

            nav: Object.assign(nav.secondary, nav),

            notify(name: string, details: any) {
                app.sendMessage('notification', { name, details });
            },

            defineAction(name: string, fn: (...args: unknown[]) => unknown) {
                app.actions.set(name, fn);
                app.sendMessage('defineAction', name);
            },

            setPageHash(hash: string, replace = false) {
                app.sendMessage('setPageHash', { hash, replace });
            },
            setPage(id: string, ref: PageRef, params: PageParams, replace = false) {
                app.sendMessage('setPage', { id, ref, params, replace });
            },
            setPageRef(ref: PageRef, replace = false) {
                app.sendMessage('setPageRef', { ref, replace });
            },
            setPageParams(params: PageParams, replace = false) {
                app.sendMessage('setPageParams', { params, replace });
            },

            setColorSchemeState(value: ColorSchemeState) {
                app.sendMessage('setColorSchemeState', value);
            },
            setRouterPreventLocationUpdate(allow = true) {
                app.sendMessage('setRouterPreventLocationUpdate', allow);
            },
            setLocationSync(enabled = true) {
                if (enabled && !app.locationSync) {
                    app.locationSync = createLocationSync((hash) => app.publicApi.setPageHash(hash));
                    app.on('pageHashChanged', app.locationSync.set);
                } else if (!enabled && app.locationSync) {
                    app.off('pageHashChanged', app.locationSync.set);
                    app.locationSync.dispose();
                    app.locationSync = null;
                }
            },

            unloadData() {
                app.sendMessage('unloadData', null);
            },
            async uploadData(source: unknown, getResourceMetadataFromSource: typeof extractResourceMetadata) {
                const dataLoadToken = randomId();

                app.dataLoadToken = dataLoadToken;

                try {
                    return await uploadData(app, source, getResourceMetadataFromSource);
                } finally {
                    if (app.dataLoadToken === dataLoadToken) {
                        app.dataLoadToken = null;
                    }
                }
            }
        });
    }

    constructor(window: Window, id: string, actions: ActionsMap) {
        super(window, id, actions);

        this.commandMap = new Map();
        this.dataLoadToken = null;

        this.pageHash = new Observer('#');
        this.pageId = new Observer('');
        this.pageRef = new Observer('');
        this.pageParams = new Observer({});
        this.locationSync = null;
        this.colorScheme = new Observer({ state: 'unknown', value: 'unknown' },
            (prev, next) => prev.state !== next.state || prev.value !== next.value
        );

        this.publicApi = EmbedApp.createPublicApi(this);
    }
    async processMessage(message: EmbedClientToHostMessage) {
        switch (message.type) {
            case 'destroy': {
                this.destroy();
                break;
            }

            case 'action': {
                const { callId, name, args } = message.payload;
                const fn = this.actions.get(name);

                if (typeof fn === 'function') {
                    try {
                        this.sendMessage('actionResult', { callId, value: await fn(...args) });
                    } catch (error) {
                        this.sendMessage('actionResult', { callId, error });
                    }
                } else {
                    console.warn(`${logPrefix} Action "${name}" was not found`);
                }

                break;
            }

            case 'navMethod': {
                const fn = this.commandMap.get(message.payload);

                if (typeof fn === 'function') {
                    fn();
                } else {
                    console.warn(`${logPrefix} Nav command "${message.payload}" was not found`);
                }

                break;
            }

            case 'pageHashChanged': {
                const { replace, hash, id, ref, params } = message.payload || {};
                const hash_ = String(hash).startsWith('#') ? hash : '#' + hash;

                this.pageHash.set(hash_);
                this.pageId.set(id);
                this.pageRef.set(ref);
                this.pageParams.set(params);
                this.emit('pageHashChanged', hash_, replace);

                break;
            }

            case 'colorSchemeChanged': {
                const value = message.payload;

                this.colorScheme.set(value);
                this.emit('colorSchemeChanged', value);

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

            default:
                console.error(`${logPrefix} Unknown embed message type "${message.type}"`);
        }
    }
    destroy() {
        if (this.locationSync) {
            this.locationSync.dispose();
            this.locationSync = null;
        }

        super.destroy();
    }
}

export { loadStages, decodeStageProgress };
export function connectToEmbedApp(iframe: HTMLIFrameElement, onConnect: onConnectCallback): onDisconnectCallback;
export function connectToEmbedApp(iframe: HTMLIFrameElement, onPreinit: onPreinitCallback | void, onConnect: onConnectCallback): onDisconnectCallback;
export function connectToEmbedApp(
    iframe: HTMLIFrameElement,
    onPreinit: onPreinitCallback | onConnectCallback | void,
    onConnect?: onConnectCallback
): onDisconnectCallback {
    const actions: ActionsMap & { id: string; } = Object.assign(new Map(), { id: '' });
    let embedApp: EmbedApp | EmbedPreinitApp | null = null;
    let onDisconnect: onDisconnectCallback | void = undefined;
    const callbacks: {
        onPreinit?: onPreinitCallback,
        onConnect: onConnectCallback
    } = typeof onPreinit === 'function' && typeof onConnect !== 'function'
        ? { onPreinit: undefined, onConnect: onPreinit as onConnectCallback }
        : { onPreinit: onPreinit as onPreinitCallback, onConnect: onConnect as onConnectCallback };

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
            onDisconnect = undefined;
        }
    }

    async function handleIncomingMessages(e: MessageEvent<EmbedClientToHostMessage | EmbedPreinitToHostMessage>) {
        const data = e.data || {};

        // Event "source" will be null in case message was sent on page unload
        if (e.isTrusted && (e.source === iframe.contentWindow || e.source === null) && data.from === 'discoveryjs-app') {
            if (data.type === 'ready') {
                resetIfNeeded();

                if (actions.id !== data.id) {
                    actions.clear();
                    actions.id = data.id;
                }

                embedApp = new EmbedApp(iframe.contentWindow!, data.id, actions);
                embedApp.pageHash.set(data.payload.page.hash);
                embedApp.pageId.set(data.payload.page.id);
                embedApp.pageRef.set(data.payload.page.ref);
                embedApp.pageParams.set(data.payload.page.params);
                embedApp.colorScheme.set(data.payload.colorScheme);
                embedApp.once('destroy', resetIfNeeded);

                onDisconnect = callbacks.onConnect(embedApp.publicApi);

                return;
            }

            if (data.type === 'preinit') {
                resetIfNeeded();

                if (typeof callbacks.onPreinit === 'function') {
                    if (actions.id !== data.id) {
                        actions.clear();
                        actions.id = data.id;
                    }

                    embedApp = new EmbedPreinitApp(iframe.contentWindow!, data.id, actions);
                    embedApp.once('destroy', resetIfNeeded);
                    onDisconnect = callbacks.onPreinit(embedApp.publicApi);
                }

                return;
            }

            if (embedApp?.id === data.id) {
                embedApp.processMessage(data as any);
                return;
            }
        }
    }
}

async function uploadData(app: EmbedApp, data: unknown, getResourceMetadataFromSource = extractResourceMetadata) {
    const acceptToken = app.dataLoadToken;
    const maybeAbort = () => {
        if (app?.dataLoadToken !== acceptToken) {
            throw new Error('Data upload aborted');
        }
    };

    if (!acceptToken) {
        throw new Error('No acceptToken specified');
    }

    const source = typeof data === 'function'
        ? await data()
        : await data;

    maybeAbort();

    const resource = typeof getResourceMetadataFromSource === 'function'
        ? getResourceMetadataFromSource(source) || {}
        : {};
    const stream = getReadableStreamFromSource(source);

    if (isStreamTransferable) {
        app.sendMessage('dataStream', { stream, resource }, [stream]);
    } else {
        const reader = stream.getReader();

        app.sendMessage('startChunkedDataUpload', { acceptToken, resource });

        try {
            while (true) {
                // await new Promise(resolve => setTimeout(resolve, 1000));
                const { value, done } = await reader.read();

                maybeAbort();
                app.sendMessage(
                    'dataChunk',
                    { acceptToken, value, done },
                    typeof value !== 'string' && value?.buffer ? [value.buffer] : undefined
                );

                if (done) {
                    break;
                }
            }
        } catch (error) {
            app.sendMessage('cancelChunkedDataUpload', { acceptToken, error });
            throw error;
        } finally {
            reader.releaseLock();
        }
    }
}

function createNavSection(
    section: NavSection,
    sendMessage: EmbedApp['sendMessage'],
    commandMap: Map<string, (...args: unknown[]) => unknown>
) {
    function prepareConfig(config: NavItemConfig) {
        const commands: string[] = [];

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
        insert(config: NavItemConfig, position: NavInsertPosition, name: string) {
            sendMessage('changeNavButtons', { section, action: 'insert', name, position, ...prepareConfig(config) });
        },
        prepend(config: NavItemConfig) {
            sendMessage('changeNavButtons', { section, action: 'prepend', ...prepareConfig(config) });
        },
        append(config: NavItemConfig) {
            sendMessage('changeNavButtons', { section, action: 'append', ...prepareConfig(config) });
        },
        before(name: string, config: NavItemConfig) {
            sendMessage('changeNavButtons', { section, action: 'before', name, ...prepareConfig(config) });
        },
        after(name: string, config: NavItemConfig) {
            sendMessage('changeNavButtons', { section, action: 'after', name, ...prepareConfig(config) });
        },
        replace(name: string, config: NavItemConfig) {
            sendMessage('changeNavButtons', { section, action: 'replace', name, ...prepareConfig(config) });
        },
        remove(name: string) {
            sendMessage('changeNavButtons', { section, action: 'remove', name });
        }
    };
}
