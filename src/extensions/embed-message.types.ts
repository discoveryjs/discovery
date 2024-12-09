import type { PageParams, PageRef, PageHashState, PageHashStateWithAnchor, PageAnchor  } from '../main/model.js';
import type { ColorSchemeState, SerializedColorSchemeValue } from '../core/color-scheme.js';
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
    setPageHashState: Partial<PageHashState> & { replace?: boolean; };
    setPageHashStateWithAnchor: Partial<PageHashStateWithAnchor> & { replace?: boolean; };
    setPage: PageHashState & { replace?: boolean; };
    setPageRef: { ref: PageRef; replace?: boolean; };
    setPageParams: { params: PageParams; replace: boolean; };
    setPageAnchor: { anchor: PageAnchor; replace: boolean; };
    setColorSchemeState: ColorSchemeState;
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
        page: PageHashStateWithAnchor & { hash: string; };
        colorScheme: {
            value: SerializedColorSchemeValue;
            state: ColorSchemeState;
        };
    };
    pageHashChanged: PageHashStateWithAnchor & { hash: string; replace: boolean; };
    colorSchemeChanged: {
        value: SerializedColorSchemeValue;
        state: ColorSchemeState;
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
