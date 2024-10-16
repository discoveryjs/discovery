import jora from 'jora';
import Emitter, { EventMap } from '../core/emitter.js';
import ActionManager from '../core/action.js';
import { normalizeEncodings } from '../core/encodings/utils.js';
import ObjectMarkerManager, { ObjectMarker, ObjectMarkerConfig, ObjectMarkerDescriptor } from '../core/object-marker.js';
import type { Dataset, Encoding, LoadDataBaseOptions, LoadDataFetchOptions, LoadDataResult } from '../core/utils/load-data.js';
import { loadDataFromEvent, loadDataFromFile, loadDataFromStream, loadDataFromUrl } from '../core/utils/load-data.js';
import { createExtensionApi, setupModel } from './model-extension-api.js';
import { createLegacyExtensionApi } from './model-legacy-extension-api.js';
import { querySuggestions } from './query-suggestions.js';

export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'perf' | 'debug';
export type LogOptions = {
    level: LogLevel;
    lazy?: () => any[];
    message?: string;
    collapsed?: null | Iterable<any> | (() => Iterable<any>);
};
export type ConsoleMethods = 'log' | 'error' | 'warn' | 'info' | 'debug' | 'groupCollapsed' | 'groupEnd';
export type ConsoleLike = {
    [key in ConsoleMethods]: (...args: any[]) => void;
};

export type ExtensionFunction<T> = (host: T) => void;
export type ExtensionArray<T> = Extension<T>[];
export type ExtensionObject<T> = { [key: string]: Extension<T>; };
export type Extension<T> = ExtensionFunction<T> | ExtensionArray<T> | ExtensionObject<T>;

export type PageRef = string | number | null;
export type PageParams = Record<string, unknown> | [string, unknown][] | string;
export type LinkResolver = (value: unknown) => null | ResolvedLink;
export type ResolvedLink = {
    type: string;
    text: string;
    href: string | null;
    entity: object;
};

export type Query = string | QueryFunction;
export type QueryFunction = (data: unknown, context: unknown) => unknown;
export type QueryFromStringOptions = {
    tolerant?: boolean;
    stat?: boolean;
};

export type RawDataDataset = { data: any };
export type ModelDataset = Dataset | RawDataDataset;

export type GetDecodeParams = (pageId: string) => (entries: [string, any][]) => object;

export interface SetDataOptions {
    setPrepareWorkTitle?: (title: string) => Promise<void>;
    dataset?: Dataset;
}

export type SetupMethods = {
    setPrepare(fn: PrepareFunction): void;
    defineObjectMarker<T extends object>(name: string, options: ObjectMarkerConfig<T>): ObjectMarker<T>['mark'];
    addQueryHelpers(helpers: SetupQueryMethodsExtension): void;
};
export type SetupQueryMethodsExtension = {
    [key: string]: string | ((...args: unknown[]) => any);
};

export type PrepareFunction = (input: any, prepareContext: PrepareContextApi | LegacyPrepareContextApi) => any;
export type PrepareContextApiWrapper = {
    before?(host: Model): void;
    after?(host: Model): void;
    contextApi: PrepareContextApi | LegacyPrepareContextApi;
};
export interface PrepareContextApi {
    setWorkTitle: (title: string) => Promise<void>;
    rejectData: (message: string, extra: any) => void;
    markers: Record<string, (value: unknown) => void>;
}
export interface LegacyPrepareContextApi {
    setWorkTitle: (title: string) => Promise<void>;
    rejectData: (message: string, extra: any) => void;
    defineObjectMarker<T extends object>(name: string, options: ObjectMarkerConfig<T>): ObjectMarker<T>['mark'];
    lookupObjectMarker(value: any, type?: string): ObjectMarkerDescriptor<object> | null;
    lookupObjectMarkerAll(value: any): ObjectMarkerDescriptor<object>[];
    addValueAnnotation(query: Query, options: object | boolean): void;
    addQueryHelpers(helpers: SetupQueryMethodsExtension): void;
    query(query: Query, ...args: unknown[]): any;
}

export interface ModelEvents extends EventMap {
    data: [];
    unloadData: [];
}
export interface ModelOptions<T = Model> {
    logger: ConsoleLike
    logLevel: LogLevel;
    extensions: Extension<T>;
    encodings: Encoding[];
    setup(api: SetupMethods): void;
}
type ModelOptionsBind = ModelOptions<Model>; // to fix: Type parameter 'Options' has a circular default.

const noopQuery = () => void 0;
const noopLogger = new Proxy({}, { get: () => () => {} });
const logLevels: LogLevel[] = ['silent', 'error', 'warn', 'info', 'perf', 'debug'];
const logPrefix = '[Discovery]';

const mixinEncodings = (host: Model, options?: LoadDataBaseOptions) => ({
    ...options,
    encodings: Array.isArray(options?.encodings)
        ? [...options.encodings, ...host.encodings]
        : host.encodings
});

export class Model<
    Options extends ModelOptions = ModelOptionsBind,
    Events extends ModelEvents = ModelEvents
> extends Emitter<Events> {
    options: Partial<Options>;

    logger: ConsoleLike;
    logLevel: LogLevel;

    action: ActionManager;
    objectMarkers: ObjectMarkerManager;
    linkResolvers: LinkResolver[];

    encodings: Encoding[];
    datasets: ModelDataset[];
    data: any;
    context: any;
    prepare: PrepareFunction;
    #legacyPrepare: boolean;
    #lastSetData: symbol | undefined;

    constructor(options?: Partial<Options>) {
        super();

        // FIXME: remove this.options
        this.options = options || {};
        // Object.defineProperty(this, 'options', {
        //     get() {
        //         console.trace('get options');
        //         return options || {};
        //     }
        // });

        const {
            logLevel = 'warn',
            logger = console,
            extensions,
            encodings,
            setup
        } = options || {};

        this.logger = logger || noopLogger;
        this.logLevel = logLevels.includes(logLevel) ? logLevel : 'warn';

        this.action = new ActionManager();
        this.objectMarkers = new ObjectMarkerManager(this.log.bind(this));
        this.linkResolvers = [];

        this.datasets = [];
        this.encodings = normalizeEncodings(encodings);
        this.data = undefined;
        this.context = undefined;
        this.prepare = data => data;
        this.#legacyPrepare = true;

        this.apply(extensions);

        if (typeof setup === 'function') {
            this.#legacyPrepare = false;
            setupModel(this, setup);
        } else {
            setupModel(this, () => {});
        }

        for (const { page, lookup } of this.objectMarkers.values) {
            if (page) {
                this.linkResolvers.push((value: unknown) => {
                    const marker = lookup(value);

                    return marker && {
                        type: page,
                        text: marker.title,
                        href: marker.href,
                        entity: marker.object
                    };
                });
            }
        }
    }

    // extension
    apply(extensions?: Extension<this>) {
        if (Array.isArray(extensions)) {
            extensions.forEach(extension => this.apply(extension));
        } else if (typeof extensions === 'function') {
            extensions.call(null, this);
        } else if (extensions) {
            this.apply(Object.values(extensions));
        }
    }

    // logging
    log(levelOrOpts: LogOptions | LogLevel, ...args: unknown[]) {
        const {
            level,
            lazy = null,
            message = null,
            collapsed = null
        } = typeof levelOrOpts === 'object' && levelOrOpts !== null ? levelOrOpts : { level: levelOrOpts };
        const levelIndex = logLevels.indexOf(level);

        if (levelIndex > 0 && level !== 'silent' && levelIndex <= logLevels.indexOf(this.logLevel)) {
            const method = level === 'perf' ? 'log' : level;

            if (collapsed) {
                this.logger.groupCollapsed(`${logPrefix} ${message ?? args[0]}`);

                const entries = typeof collapsed === 'function' ? collapsed() : collapsed;
                for (const entry of Array.isArray(entries) ? entries : [entries]) {
                    this.logger[method](...Array.isArray(entry) ? entry : [entry]);
                }

                this.logger.groupEnd();
            } else {
                this.logger[method](logPrefix, ...typeof lazy === 'function' ? lazy() : args);
            }
        } else if (levelIndex === -1) {
            this.logger.error(`${logPrefix} Bad log level "${level}", supported: ${logLevels.slice(1).join(', ')}`);
        }
    }

    // ==========
    // Data
    //

    setPrepare(fn: PrepareFunction) {
        if (typeof fn !== 'function') {
            throw new Error('An argument should be a function');
        }

        this.prepare = fn;
    }

    setData(data: unknown, options?: SetDataOptions) {
        options = options || {};

        // mark as last setData promise
        const setDataMarker = Symbol();
        this.#lastSetData = setDataMarker;

        const startTime = Date.now();
        const checkIsNotPrevented = () => {
            // prevent race conditions, perform only if this promise is last one
            if (this.#lastSetData !== setDataMarker) {
                throw new Error('Prevented by another setData()');
            }
        };

        const prepareApi = this.#legacyPrepare
            ? createLegacyExtensionApi(this, options)
            : createExtensionApi(this, options);
        const setDataPromise = Promise.resolve()
            .then(() => {
                checkIsNotPrevented();

                prepareApi.before?.(this);
                return this.prepare.call(null, data, prepareApi.contextApi) || data;
            })
            .then((data) => {
                checkIsNotPrevented();

                this.datasets = [{ ...options.dataset, data }];
                this.data = data;

                prepareApi.after?.(this);

                this.emit('data');
                this.log('perf', `Data prepared in ${Date.now() - startTime}ms`);
            });

        return setDataPromise;
    }

    async trackLoadDataProgress(loadDataResult: LoadDataResult) {
        const startTime = Date.now();
        const dataset = await loadDataResult.dataset;

        this.log('perf', `Data loaded in ${Date.now() - startTime}ms`);

        return this.setData(dataset.data, { dataset });
    }

    loadDataFromStream(stream: ReadableStream, options?: LoadDataBaseOptions) {
        return this.trackLoadDataProgress(loadDataFromStream(stream, mixinEncodings(this, options)));
    }

    loadDataFromEvent(event: DragEvent | InputEvent, options?: LoadDataBaseOptions) {
        return this.trackLoadDataProgress(loadDataFromEvent(event, mixinEncodings(this, options)));
    }

    loadDataFromFile(file: File, options?: LoadDataBaseOptions) {
        return this.trackLoadDataProgress(loadDataFromFile(file, mixinEncodings(this, options)));
    }

    loadDataFromUrl(url: string, options?: LoadDataFetchOptions) {
        return this.trackLoadDataProgress(loadDataFromUrl(url, mixinEncodings(this, options)));
    }

    unloadData() {
        if (!this.hasDatasets()) {
            return;
        }

        this.datasets = [];
        this.data = undefined;
        this.context = undefined;

        this.emit('unloadData');
    }

    hasDatasets() {
        return this.datasets.length !== 0;
    }

    // ======================
    // Data query
    //

    getQueryEngineInfo() {
        return {
            name: 'jora',
            version: jora.version,
            link: 'https://discoveryjs.github.io/jora/#article:jora-syntax'
        };
    }

    // This method is overrides on init by setupModel();
    // used method definition aside to avoid lint errors, since stub implementation doesn't use query parameter
    queryFnFromString(query: string, options?: QueryFromStringOptions): QueryFunction;
    queryFnFromString() {
        return noopQuery;
    }

    queryFn(query: Query): QueryFunction {
        switch (typeof query) {
            case 'function':
                return query;

            case 'string':
                return this.queryFnFromString(query);
        }
    }

    query(query: any, data: unknown, context: unknown): unknown {
        switch (typeof query) {
            case 'function':
                return query(data, context);

            case 'string':
                return this.queryFn(query)(data, context);

            default:
                return query;
        }
    }

    queryBool(query: any, data: unknown, context: unknown): boolean {
        return jora.buildin.bool(this.query(query, data, context));
    }

    querySuggestions(query: string, offset: number, data: unknown, context: unknown) {
        return querySuggestions(this, query, offset, data, context);
    }

    pathToQuery(path: (string | number)[]): string {
        return path.map((part, idx) =>
            part === '*'
                ? (idx === 0 ? 'values()' : '.values()')
                : typeof part === 'number' || !/^[a-zA-Z_][a-zA-Z_$0-9]*$/.test(part)
                    ? (idx === 0 ? `$[${JSON.stringify(part)}]` : `[${JSON.stringify(part)}]`)
                    : (idx === 0 ? part : '.' + part)
        ).join('');
    }

    // ======================
    // Links
    //

    encodePageHash(pageId: string, pageRef: PageRef = null, pageParams?: PageParams) {
        let encodedParams = pageParams;

        if (encodedParams && typeof encodedParams !== 'string') {
            if (!Array.isArray(encodedParams)) {
                encodedParams = Object.entries(encodedParams);
            }

            encodedParams = encodedParams
                .map(pair => pair.map(encodeURIComponent).join('='))
                .join('&');
        }

        return `#${
            pageId ? encodeURIComponent(pageId) : ''
        }${
            (typeof pageRef === 'string' && pageRef) || (typeof pageRef === 'number') ? ':' + encodeURIComponent(pageRef) : ''
        }${
            encodedParams ? '&' + encodedParams : ''
        }`;
    }

    decodePageHash(hash: string, getDecodeParams: GetDecodeParams = () => Object.fromEntries) {
        const delimIndex = (hash.indexOf('&') + 1 || hash.length + 1) - 1;
        const [pageId, pageRef = null] = hash.substring(hash[0] === '#' ? 1 : 0, delimIndex).split(':').map(decodeURIComponent);
        const pairs: [string, string | boolean][] = hash.slice(delimIndex + 1).split('&').filter(Boolean).map(pair => {
            const eqIndex = pair.indexOf('=');
            return eqIndex !== -1
                ? [decodeURIComponent(pair.slice(0, eqIndex)), decodeURIComponent(pair.slice(eqIndex + 1))]
                : [decodeURIComponent(pair), true];
        });

        return {
            pageId,
            pageRef,
            pageParams: getDecodeParams(pageId)(pairs)
        };
    }

    resolveValueLinks(value: unknown) {
        const result: ResolvedLink[] = [];
        const type = typeof value;

        if (value && (type === 'object' || type === 'string')) {
            for (const resolver of this.linkResolvers) {
                const link = resolver(value);

                if (link) {
                    result.push(link);
                }
            }
        }

        return result.length ? result : null;
    }
}
