export interface BaseNode {
    start(): Promise<void>;
    stop(): Promise<void>;
    get(cid: string, timeout?: number): Promise<Buffer>;
    check(cid: string, timeout?: number): Promise<CheckFileResponse>;
}

export type CheckFileResponse = {
    check?: boolean,
    error?: string
}