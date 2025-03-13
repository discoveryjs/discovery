import jora from 'jora';
import type { ObjectMarker, ObjectMarkerConfig, ObjectMarkerDescriptor } from '../core/object-marker.js';
import type { Dataset, Encoding, LoadDataBaseOptions, LoadDataFetchOptions, LoadDataResult } from '../core/utils/load-data.js';
import type { ConsoleLike, LogLevel } from '../core/utils/logger.js';
import { normalizeEncodings } from '../core/encodings/utils.js';
import { loadDataFromEvent, loadDataFromFile, loadDataFromStream, loadDataFromUrl } from '../core/utils/load-data.js';
import { Emitter } from '../core/emitter.js';
import { ActionManager } from '../core/action.js';
import { ObjectMarkerManager } from '../core/object-marker.js';
import { createExtensionApi, setupModel } from './model-extension-api.js';
import { createLegacyExtensionApi } from './model-legacy-extension-api.js';
import { querySuggestions } from './query-suggestions.js';
import { Logger } from '../core/utils/logger.js';
import { equal } from '../core/utils/compare.js';

export type LogOptions = {
    level: LogLevel;
    lazy?: () => any[];
    message?: string;
    collapsed?: null | Iterable<any> | (() => Iterable<any>);
};

export type ExtensionFunction<T> = (host: T) => void;
export type ExtensionArray<T> = Extension<T>[];
export type ExtensionObject<T> = { [key: string]: Extension<T>; };
export type Extension<T> = ExtensionFunction<T> | ExtensionArray<T> | ExtensionObject<T>;

export type PageId = string;
export type PageRef = string | number | null;
export type PageParams = Record<string, unknown> | [string, unknown][] | string;
export type PageAnchor = string | null;
export type PageHashStateWithAnchor = PageHashState & { anchor: PageAnchor; }
export type PageHashState = {
    id: PageId;
    ref: PageRef;
    params: PageParams;
};

export type LinkResolver = (value: unknown) => null | ResolvedLink;
export type ResolvedLink = {
    type: string;
    text: string;
    href: string | null;
    entity: object;
};

export type Query = string | QueryFunction;
export type QueryFunction = ((data: unknown, context: unknown) => unknown) & { query?: string };
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

export type ModelEvents = {
    data: [];
    context: [prevContext: unknown, nextContext: unknown];
    unloadData: [];
}
export interface ModelOptions<T = Model> {
    name: string;
    version: string;
    description: string;
    icon: string;

    logger: ConsoleLike;
    logLevel: LogLevel;

    extensions: Extension<T>;
    encodings: Encoding[];
    context: any;
    setup(api: SetupMethods): void;
}
type ModelOptionsBind = ModelOptions<Model>; // FIXME: Type parameter 'Options' has a circular default.

const noopQuery = () => void 0;
const logPrefix = '[Discovery]';

const isJoraIdentifier = (value: string) =>
    /^[a-zA-Z_][a-zA-Z_$0-9]*$/.test(value) && !joraKeywords.includes(value);
const joraKeywords = [
    'and', 'or', 'in', 'has', 'is', 'not', 'no',
    'asc', 'ascN', 'ascA', 'ascNA', 'ascAN',
    'desc', 'descN', 'descA', 'descNA', 'descAN'
];

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
    info: {
        name: string;
        version: string | null;
        description: string | null;
        icon: string | null;
    };

    logger: Logger;

    action: ActionManager;
    objectMarkers: ObjectMarkerManager;
    linkResolvers: LinkResolver[];

    encodings: Encoding[];
    datasets: ModelDataset[];
    data: any;
    #context: any;
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
            name,
            version,
            description,
            icon,

            logLevel = 'warn',
            logger = console,

            extensions,

            encodings,
            context,
            setup
        } = options || {};

        this.info = {
            name: name || 'Untitled model',
            version: version || null,
            description: description || null,
            icon: icon || null
        };

        this.logger = new Logger(logPrefix, logLevel, logger);

        this.action = new ActionManager();
        this.objectMarkers = new ObjectMarkerManager(this.logger);
        this.linkResolvers = [];

        this.datasets = [];
        this.encodings = normalizeEncodings(encodings);
        this.data = undefined;
        this.#context = context;
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
    log() {
        this.logger.error('Model#log() is deprecated, use Model#logger interface instead');
    }

    // ==========
    // Data & context
    //

    get legacyPrepare() {
        return this.#legacyPrepare;
    }
    setPrepare(fn: PrepareFunction) {
        if (typeof fn !== 'function') {
            throw new Error('An argument should be a function');
        }

        this.prepare = fn;
    }

    get context(): any {
        return this.#context;
    }
    set context(context: unknown) {
        this.setContext(context, true);
    }
    setContext(context: unknown, replace = false) {
        const prevContext = this.#context;

        if (replace) {
            this.#context = context;
        } else {
            const newContext = {
                ...this.#context,
                ...context as any
            };

            if (!equal(newContext, prevContext)) {
                this.#context = newContext;
            }
        }

        if (!Object.is(this.#context, prevContext)) {
            this.emit('context', prevContext, this.#context);
        }
    }
    getContext() {
        return {
            model: this.info,
            actions: this.action.actionMap,
            datasets: this.datasets,
            data: this.data,
            ...this.context
        };
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
                this.logger.perf(`Data prepared in ${Date.now() - startTime}ms`);
            });

        return setDataPromise;
    }

    async trackLoadDataProgress(loadDataResult: LoadDataResult) {
        const startTime = Date.now();
        const dataset = await loadDataResult.dataset;

        this.logger.perf(`Data loaded in ${Date.now() - startTime}ms`);

        return this.setData(dataset.data, { dataset });
    }

    loadDataFromStream(stream: ReadableStream, options?: LoadDataBaseOptions) {
        return this.trackLoadDataProgress(loadDataFromStream(stream, mixinEncodings(this, options)));
    }

    loadDataFromEvent(event: DragEvent | ClipboardEvent | InputEvent, options?: LoadDataBaseOptions) {
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
                return Object.assign(this.queryFnFromString(query), { query });
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
        let query = '';
        const putPart = (part: string) =>
            query += query === ''
                ? part[0] === '[' ? '$' + part : part
                : part[0] === '[' ? part : '.' + part;

        for (const part of path) {
            if (part === '*') {
                putPart('values()');
            } else if (typeof part === 'number') {
                putPart(`[${part}]`);
            } else if (isJoraIdentifier(part)) {
                putPart(part);
            } else {
                putPart(`["${part}"]`);
            }
        }

        return query;
    }

    // ======================
    // Links
    //

    stripAnchorFromHash(hash: string) {
        return typeof hash === 'string'
            ? hash.replace(/(^|&)!anchor(=[^&]+|(?=&|$))/g, '')
            : hash;
    }

    encodePageHash(pageId: string | null = null, pageRef: PageRef = null, pageParams?: PageParams, pageAnchor: PageAnchor = null) {
        let encodedParams = pageParams;

        if (encodedParams) {
            if (typeof encodedParams !== 'string') {
                if (!Array.isArray(encodedParams)) {
                    encodedParams = Object.entries(encodedParams);
                }

                encodedParams = encodedParams
                    .filter(([name]) => name !== '!anchor')
                    .map(pair => pair.map(encodeURIComponent).join('='))
                    .join('&');
            } else {
                encodedParams = this.stripAnchorFromHash(encodedParams);
            }
        }

        return `#${
            pageId ? encodeURIComponent(pageId) : ''
        }${
            (typeof pageRef === 'string' && pageRef) || (typeof pageRef === 'number') ? ':' + encodeURIComponent(pageRef) : ''
        }${
            encodedParams ? '&' + encodedParams : ''
        }${
            pageAnchor ? '&!anchor=' + encodeURIComponent(pageAnchor) : ''
        }`;
    }

    decodePageHash(hash: string, getDecodeParams: GetDecodeParams = () => Object.fromEntries) {
        const delimIndex = (hash.indexOf('&') + 1 || hash.length + 1) - 1;
        const [pageId, pageRef = null] = hash.substring(hash[0] === '#' ? 1 : 0, delimIndex).split(':').map(decodeURIComponent);
        const paramsTuples: [string, string | boolean][] = [];
        let pageAnchor: string | null = null;

        for (const pair of hash.slice(delimIndex + 1).split('&').filter(Boolean)) {
            const eqIndex = pair.indexOf('=');
            let name: string;
            let value: string | boolean;

            if (eqIndex !== -1) {
                name = decodeURIComponent(pair.slice(0, eqIndex));
                value = decodeURIComponent(pair.slice(eqIndex + 1));
            } else {
                name = decodeURIComponent(pair);
                value = true;
            }

            if (name === '!anchor') {
                pageAnchor = value && value !== true
                    ? value
                    : null;
            } else {
                paramsTuples.push([name, value]);
            }
        }

        return {
            pageId,
            pageRef,
            pageParams: getDecodeParams(pageId)(paramsTuples) as Record<string, unknown>,
            pageAnchor
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
