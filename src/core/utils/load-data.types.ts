export type Encoding =
    | {
        name: string;
        test: (chunk: Uint8Array) => boolean;
        streaming: true;
        decode: (iterator: AsyncIterator<Uint8Array>) => Promise<any>;
    }
    | {
        name: string;
        test: (chunk: Uint8Array) => boolean;
        streaming: false;
        decode: (payload: Uint8Array) => any;
    };

export type LoadDataState = 
    | {
        stage: 'inited' | 'request' | 'receive' | 'received',
        progress?: LoadDataStateProgress
    }
    | {
        stage: 'error',
        error: Error
    };
export type SetProgressCallack = (state: LoadDataStateProgress) => void;
export type LoadDataStateProgress = {
    done: boolean;
    elapsed: number;
    units?: 'bytes';
    completed: number;
    total?: number;
};

export type LoadDataMethod = 'stream' | 'file' | 'fetch' | 'push';
export type LoadDataSource = ArrayBufferView | string | string[] | Iterable<unknown> | AsyncIterable<unknown>;
export type LoadDataResourceSource = Response | File | Blob | ArrayBufferView | string;
export type LoadDataResourceMetadata = {
    type?: string;
    name?: string;
    size?: number | null;
    encodedSize?: number;
    createdAt?: string | number;
};
export type LoadDataOptions = {
    encodings?: Encoding[];
    resource?: LoadDataResourceMetadata;

    fetch?: RequestInit;
    isResponseOk?: (response: Response) => boolean;
    getContentSize?: (response: Response) => string | undefined;
    getContentEncodedSize?: (response: Response) => string | undefined;
    getContentCreatedAt?: (response: Response) => string | undefined;
};
export type LoadDataRequest = () => LoadDataRequestResult | Promise<LoadDataRequestResult>;
export type LoadDataRequestResult = {
    method: LoadDataMethod;
    stream: ReadableStream<Uint8Array>;
    resource?: LoadDataResourceMetadata;
    options: LoadDataOptions;
    data?: any;
}

export type Dataset = {
    loadMethod: LoadDataMethod;
    resource: DatasetResource;
    meta: any;
    data: any;
    timing: DatasetTimings;
};
export type DatasetResource = {
    type: string;
    name: string;
    encoding: string;
    size: number;
    encodedSize: number | null;
    createdAt: Date;
};
export type DatasetTimings = {
    time: number;
    start: Date;
    end: Date;
    requestTime: number;
    requestStart: Date;
    requestEnd: Date;
    responseTime: number;
    responseStart: Date;
    responseEnd: Date;
};
