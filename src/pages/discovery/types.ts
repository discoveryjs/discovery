export type KnownParams = {
    dzen: boolean;
    noedit: boolean;
    title: string;
    query: string;
    graph: Graph;
    view: string | undefined;
    viewEditorHidden: boolean;
};
export type Params = KnownParams & {
    [key: string]: unknown;
};
export type UpdateHostParams = (patch: Partial<Params>, replace?: boolean) => void;
export type Graph = {
    current: number[];
    children: GraphNode[];
};
export type GraphNode = Partial<{
    label: string;
    query: string;
    view: string;
    children: GraphNode[];
}>;
export type Computation = {
    state: 'successful' | 'failed' | 'awaiting' | 'computing' | 'canceled';
    path: string;
    query: string;
    error: Error & { details?: any } | null;
    data: unknown;
    context: unknown;
    computed: unknown;
    duration: number;
};
