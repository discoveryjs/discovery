import type { PageParams, PageRef  } from '../main/model.js';
import type { Mode as DarkmodeMode } from '../core/darkmode.js';
import { ProgressbarState } from '../core/utils/progressbar.js';
import { LoadDataResourceMetadata, LoadDataState } from '../core/utils/load-data.types.js';
import { NavItemConfig } from '../nav/index.js';

export type CreateMessageType<T extends Record<string, any>> = {
    [K in keyof T]: {
        from: 'discoveryjs-app';
        id: string;
        type: K;
        payload: T[K];
    };
}[keyof T];

type PageState = {
    hash: string;
    id: string;
    ref: PageRef;
    params: PageParams;
};

export type NavSection = 'primary' | 'secondary' | 'menu';
export type NavInsertPosition = 'before' | 'after' | number;
export type NavMessageCommon = { section: NavSection; commands: string[]; };

export type EmbedHostToPreinitMessage = CreateMessageType<{
    defineAction: string;
    setPageHash: { hash: string; replace?: boolean; };
    setRouterPreventLocationUpdate: boolean;
}>;

export type EmbedPreinitToHostMessage = CreateMessageType<{
    preinit: { page: { hash: string; } };
    loadingState: LoadDataState;
    destroy: null;
}>;

export type EmbedHostToClientPostponeMessage = Extract<EmbedHostToPreinitMessage, {
    type: 'defineAction' | 'setPageHash' | 'setRouterPreventLocationUpdate'
}>;

export type EmbedHostToClientMessage = CreateMessageType<{
    defineAction: string;
    notification: { name: string; details: any; };
    setPageHash: { hash: string; replace?: boolean; };
    setPage: Omit<PageState, 'hash'> & { replace?: boolean; };
    setPageRef: { ref: PageRef; replace?: boolean; };
    setPageParams: { params: PageParams; replace: boolean; };
    setDarkmode: 'auto' | 'light' | 'dark';
    setRouterPreventLocationUpdate: boolean;
    unloadData: null;
    actionResult:
        | { callId: string; value: unknown; }
        | { callId: string; error: string; }

    changeNavButtons:
        | { section: NavSection; action: 'insert'; name: string; position: NavInsertPosition; config: NavItemConfig; commands: string[]; }
        | { section: NavSection; action: 'prepend'; config: NavItemConfig; commands: string[]; }
        | { section: NavSection; action: 'append'; config: NavItemConfig; commands: string[]; }
        | { section: NavSection; action: 'before'; name: string; config: NavItemConfig; commands: string[]; }
        | { section: NavSection; action: 'after'; name: string; config: NavItemConfig; commands: string[]; }
        | { section: NavSection; action: 'replace'; name: string; config: NavItemConfig; commands: string[]; }
        | { section: NavSection; action: 'remove'; name: string; }

    dataStream: {
        stream: ReadableStream;
        resource: LoadDataResourceMetadata;
    };
    startChunkedDataUpload: {
        acceptToken: string;
        resource: LoadDataResourceMetadata;
    };
    dataChunk: {
        acceptToken: string;
        value: Uint8Array | undefined;
        done: boolean;
    };
    cancelChunkedDataUpload: {
        acceptToken: string;
        error: string;
    };
}>;

export type EmbedClientToHostMessage = CreateMessageType<{
    ready: {
        page: PageState;
        darkmode: {
            mode: DarkmodeMode;
            value: 'auto' | 'dark' | 'light';
        };
    };
    pageHashChanged: PageState & { replace: boolean; };
    darkmodeChanged: {
        mode: DarkmodeMode;
        value: 'auto' | 'dark' | 'light';
    };
    action: {
        callId: string;
        name: string;
        args: unknown[];
    };
    navMethod: string;
    loadingState: ProgressbarState;
    data: null;
    unloadData: null;
    destroy: null;
}>;
