import type { Observer } from '../observer.js';

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

export type LoadDataState = {
    state: Observer<LoadDataStage>;
    result: Promise<Dataset>;
}

export type LoadDataStage = 
    | {
        stage: 'inited' | 'request' | 'receive' | 'received',
        progress?: LoadDataStageProgress
    }
    | {
        stage: 'error',
        error: Error
    };
export type SetProgressCallack = (state: LoadDataStageProgress) => void;
export type LoadDataStageProgress = {
    done: boolean;
    elapsed: number;
    units?: 'bytes';
    completed: number;
    total?: number;
};

export type LoadDataMethod = 'stream' | 'file' | 'fetch' | 'push';
export type LoadDataResourceSource = Response | File | Blob | ArrayBufferView | string;
export type LoadDataResourceMetadata = {
    type?: string;
    name?: string;
    size?: number | null;
    encodedSize?: number;
    createdAt?: string | number;
};
export type LoadDataRequestOptions = {
    encodings?: Encoding[];
}
export type LoadDataBaseOptions = LoadDataRequestOptions & {
    resource?: LoadDataResourceMetadata;
}
export type LoadDataFetchOptions = LoadDataBaseOptions & ExtractResourceOptions & {
    fetch?: RequestInit;
}
export type ExtractResourceOptions = {
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
    options: LoadDataRequestOptions;
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
