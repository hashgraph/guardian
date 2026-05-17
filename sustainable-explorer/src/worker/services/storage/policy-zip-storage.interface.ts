export const POLICY_ZIP_STORAGE = Symbol('POLICY_ZIP_STORAGE');

export interface PolicyZipStorage {
    exists(cid: string): Promise<boolean>;
    read(cid: string): Promise<Buffer>;
    write(cid: string, buffer: Buffer): Promise<void>;
    delete(cid: string): Promise<void>;
}
