export interface BaseNode {
    start(): Promise<void>;
    stop(): Promise<void>;
    get(cid: string): Promise<Buffer>;
}
