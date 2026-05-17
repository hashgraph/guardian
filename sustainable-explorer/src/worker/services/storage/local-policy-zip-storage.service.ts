import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { PolicyZipStorage } from './policy-zip-storage.interface';

@Injectable()
export class LocalPolicyZipStorage implements PolicyZipStorage, OnModuleInit {
    private readonly logger = new Logger(LocalPolicyZipStorage.name);
    private readonly root: string;

    constructor() {
        this.root = resolve(process.env.POLICY_ZIP_STORAGE_PATH || './data/policy-zips');
    }

    async onModuleInit(): Promise<void> {
        await fs.mkdir(this.root, { recursive: true });
        this.logger.log(`Policy zip storage rooted at ${this.root}`);
    }

    async exists(cid: string): Promise<boolean> {
        try {
            await fs.access(this.pathFor(cid));
            return true;
        } catch {
            return false;
        }
    }

    async read(cid: string): Promise<Buffer> {
        return fs.readFile(this.pathFor(cid));
    }

    // Atomic write via tmp + rename so concurrent workers can't read a partial file.
    async write(cid: string, buffer: Buffer): Promise<void> {
        const finalPath = this.pathFor(cid);
        const tmpPath = `${finalPath}.${process.pid}.tmp`;
        await fs.writeFile(tmpPath, buffer);
        await fs.rename(tmpPath, finalPath);
    }

    async delete(cid: string): Promise<void> {
        try {
            await fs.unlink(this.pathFor(cid));
        } catch (err: unknown) {
            if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') throw err;
        }
    }

    private pathFor(cid: string): string {
        if (!/^[A-Za-z0-9]+$/.test(cid)) {
            throw new Error(`Invalid CID for storage path: ${cid}`);
        }
        return join(this.root, `${cid}.zip`);
    }
}
