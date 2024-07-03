export type EmitterEventMap = Record<string, unknown[]>;
export type EmitterCallback<P extends unknown[]> = (...args: P) => void;
export type EmitterListener<P extends unknown[]> = {
    callback: EmitterCallback<P> | null;
    next: EmitterListener<P> | null;
};

export class Emitter<EventMap extends EmitterEventMap> {
    protected listeners: {
        [EventName in keyof EventMap]: EmitterListener<EventMap[EventName]> | null;
    };

    on<K extends keyof EventMap>(event: K, callback: EmitterCallback<EventMap[K]>): this;
    once<K extends keyof EventMap>(event: K, callback: EmitterCallback<EventMap[K]>): this;
    off<K extends keyof EventMap>(event: K, callback: EmitterCallback<EventMap[K]>): this;
    emit<K extends keyof EventMap>(event: K, ...args: EventMap[K]): boolean;
}

export interface ReadonlyObserver<T> {
    readonly value: T;
    subscribe(fn: (newValue: T, unsubscribe: () => void) => void): () => void;
}

export type PageParams = Record<string, any>;
export type ViewConfig = Record<string, any>;

export interface NavSection {
    insert(config: ViewConfig, position: number, name: string): void;
    prepend(config: ViewConfig): void;
    append(config: ViewConfig): void;
    before(name: string, config: ViewConfig): void;
    after(name: string, config: ViewConfig): void;
    replace(name: string, config: ViewConfig): void;
    remove(name: string): void;
}

export type EmbedAppEvents = {
    loadingStateChanged: [state: any];
    pageHashChanged: [hash: string, replace: boolean];
    darkmodeChanged: [value: string];
    unloadData: [];
    data: [];
}

export type DataSource = ReadableStream | Response | File | Blob | ArrayBuffer | string | Iterable<ArrayBuffer | string>;

export interface EmbedAppPublicApi extends Emitter<EmbedAppEvents> {
    pageHash: ReadonlyObserver<string>;
    pageId: ReadonlyObserver<string>;
    pageRef: ReadonlyObserver<string>;
    pageParams: ReadonlyObserver<PageParams>;
    darkmode: ReadonlyObserver<{ mode: string; value: string }>;

    nav: NavSection & {
        primary: NavSection;
        secondary: NavSection;
        menu: NavSection;
    };

    defineAction: (name: string, fn: (...args: any[]) => any) => void;

    setPageHash: (hash: string, replace?: boolean) => void;
    setPage: (id: string, ref: string, params: PageParams, replace?: boolean) => void;
    setPageRef: (ref: string, replace?: boolean) => void;
    setPageParams: (params: PageParams, replace?: boolean) => void;
    setDarkmode: (value: string) => void;
    setRouterPreventLocationUpdate: (allow: boolean) => void;
    unloadData: () => void;
    uploadData: (source: () => DataSource | Promise<DataSource>, extractResourceMetadata?: (source: DataSource) => unknown) => void;
}

export type PreinitEmbedAppEvents = {
    loadingStateChanged: [state: any];
}

export interface PreinitEmbedAppPublicApi extends Emitter<PreinitEmbedAppEvents> {
    defineAction: (name: string, fn: (...args: any[]) => any) => void;
    setPageHash: (hash: string, replace?: boolean) => void;
    setRouterPreventLocationUpdate: (allow: boolean) => void;
}

export type DisconnectCallback = () => void;

export function connectToEmbedApp(
    iframe: HTMLIFrameElement,
    onConnect: (api: EmbedAppPublicApi) => DisconnectCallback | void,
): () => void;

export function connectToEmbedApp(
    iframe: HTMLIFrameElement,
    onPreinit: (initApp: PreinitEmbedAppPublicApi) => DisconnectCallback | void,
    onConnect: (app: EmbedAppPublicApi) => DisconnectCallback | void,
): () => void;

export type StageProgress = {
    done: boolean;
    elapsed: number;
    units?: 'bytes';
    completed: number;
    total: number;
}

export function loadStages(stages: any, progressBar: HTMLElement, options: any): void;
export function decodeStageProgress(stage: string, progress?: StageProgress): {
    stageTitle: string;
    progressValue: number;
    progressText: string;
    title: string;
};
