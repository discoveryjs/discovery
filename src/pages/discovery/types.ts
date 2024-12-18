export type KnownParams = {
    dzen: boolean;
    noedit: boolean;
    title: string;
    query: string;
    graph: Graph;
    view: string | undefined;
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
    query: string;
    view: string;
    children: GraphNode[];
}>;
export type Computation = {
    state: 'successful' | 'failed' | 'awaiting' | 'computing' | 'canceled';
    path: number[];
    query: string;
    error: Error | null;
    data: unknown;
    context: unknown;
    computed: unknown;
    duration: number;
};
