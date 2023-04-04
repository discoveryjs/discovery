export type EmitterEventMap = {
    [key: string]: (...args: any[]) => void
};

export type EmitterListener<Callback> = {
    callback: Callback,
    next: EmitterListener<Callback>
};

export class Emitter<EventMap extends EmitterEventMap> {
    protected listeners: {
        [EventName in keyof EventMap]: EmitterListener<EventMap[EventName]>
    };

    on<K extends keyof EventMap>(event: K, callback: EventMap[K]): this;
    once<K extends keyof EventMap>(event: K, callback: EventMap[K]): this;
    off<K extends keyof EventMap>(event: K, callback: EventMap[K]): this;
    emit<K extends keyof EventMap>(event: K, ...args: Parameters<EventMap[K]>): boolean;
}

export interface ReadonlyPublisher<T> {
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
    loadingStateChanged: (state: any) => void;
    pageHashChanged: (hash: string, replace: boolean) => void;
    darkmodeChanged: (value: string) => void;
    unloadData: () => void;
    data: () => void;
}

export type DataSource = ReadableStream | Response | File | Blob | ArrayBuffer | string | Iterable<ArrayBuffer | string>;

export interface EmbedAppPublicApi extends Emitter<EmbedAppEvents> {
    pageHash: ReadonlyPublisher<string>;
    pageId: ReadonlyPublisher<string>;
    pageRef: ReadonlyPublisher<string>;
    pageParams: ReadonlyPublisher<PageParams>;
    darkmode: ReadonlyPublisher<{ mode: string; value: string }>;

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
    unloadData: () => void;
    uploadData: (source: () => DataSource | Promise<DataSource>, extractResourceMetadata?: (source: DataSource) => unknown) => void;
}

export type PreinitEmbedAppEvents = {
    loadingStateChanged: (state: any) => void;
}

export interface PreinitEmbedAppPublicApi extends Emitter<PreinitEmbedAppEvents> {
    defineAction: (name: string, fn: (...args: any[]) => any) => void;
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
