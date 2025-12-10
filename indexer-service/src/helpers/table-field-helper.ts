import { DataBaseHelper, Message } from '@indexer/common';
import { IPFS_CID_PATTERN } from '@indexer/interfaces';
import { IPFSService } from './ipfs-service.js';

export class TableFieldHelper {
    /**
     * Attach table-files mapping to VC analytics.
     *
     * @param entity
     * @param message
     * @param fileMap    Map<filename, fileContent> from preloaded GridFS read
     */
    public async attachTableFilesAnalytics(
        entity: Message,
        message: Message,
        fileMap: Map<string, string>
    ): Promise<void> {
        try {
            const cidToFileId = await this.computeTableFilesMap(message, fileMap);

            const hasData =
                cidToFileId &&
                Object.keys(cidToFileId).length > 0;

            if (!hasData) {
                return;
            }

            const previousAnalytics = entity.analytics || {};

            entity.analytics = {
                ...previousAnalytics,
                tableFiles: cidToFileId
            };
        } catch (error) {
            const errorText = error instanceof Error ? error.message : String(error);
            console.error('attachTableFilesAnalytics:', errorText);
        }
    }

    private parseFile(file: string | undefined): any | null {
        try {
            if (file) {
                return JSON.parse(file);
            } else {
                return null;
            }
        } catch (error) {
            return null;
        }
    }

    private getSubject(documentFile: any): any {
        if (documentFile && documentFile.credentialSubject) {
            return documentFile.credentialSubject[0] || documentFile.credentialSubject
        }
        return null;
    }

    /**
     * Build a map { cid: gridfsId } for all table-like assets referenced by the VC.
     *
     * @param message
     * @param fileMap    Map<filename, fileContent> from preloaded GridFS read
     * @returns          Record<string, string> where key = CID, value = GridFS _id
     */
    private async computeTableFilesMap(
        message: Message,
        fileMap: Map<string, string>
    ): Promise<Record<string, string>> {
        const vcCid = this.findVcCid(message.files, fileMap);

        let vcString: string | undefined;

        if (vcCid) {
            vcString = fileMap.get(vcCid);
        }

        if (!vcString && Array.isArray(message.documents) && message.documents[0]) {
            vcString = message.documents[0];
        }

        if (!vcString) {
            return {};
        }

        const vcJson = this.parseFile(vcString);
        const subject = this.getSubject(vcJson);

        if (!subject) {
            return {};
        }

        const tableCids = this.extractTableCids(subject);

        if (tableCids.size === 0) {
            return {};
        }

        const vcIdentifier = message.consensusTimestamp || message.uuid || 'unknown';
        const cidToGridFsId: Record<string, string> = {};

        for (const cid of tableCids) {
            const gridFsId = await this.ensureFileCachedInGridFSStrict(vcIdentifier, cid);
            cidToGridFsId[cid] = gridFsId;
        }

        return cidToGridFsId;
    }

    /**
     * Recursively extract table-related CIDs from credentialSubject.
     *
     * @returns     Set of unique CIDs found
     * @param rootNode
     */
    private extractTableCids(rootNode: unknown): Set<string> {
        const cids = new Set<string>();

        const isCid = (value: unknown): value is string =>
            typeof value === 'string' && IPFS_CID_PATTERN.test(value);

        const parseJsonIfString = (value: unknown): unknown => {
            if (typeof value !== 'string') {
                return value;
            }
            const trimmed = value.trim();
            if (!trimmed || (trimmed[0] !== '{' && trimmed[0] !== '[')) {
                return value;
            }
            try {
                return JSON.parse(trimmed);
            } catch {
                return value;
            }
        };

        const walk = (node: unknown): void => {
            if (node === null) {
                return;
            }

            const value = parseJsonIfString(node);

            if (Array.isArray(value)) {
                for (const item of value) {
                    walk(item);
                }
                return;
            }

            if (typeof value === 'object') {
                const obj = value as Record<string, unknown>;
                const typeValue = obj.type;
                const cidValue = obj.cid;

                if (
                    typeof typeValue === 'string' &&
                    typeValue.toLowerCase() === 'table' &&
                    isCid(cidValue)
                ) {
                    cids.add(String(cidValue));
                }

                for (const child of Object.values(obj)) {
                    walk(child);
                }
            }
        };

        walk(rootNode);
        return cids;
    }

    /**
     * Ensure file with given CID is cached in our GridFS (filename = CID).
     * If missing, downloads bytes from IPFS and uploads to GridFS.
     *
     * @param vcId
     * @param cid        IPFS CID string
     * @param timeoutMs  IPFS gateway timeout (ms)
     * @returns          GridFS file _id as string or null if failed
     */
    private async ensureFileCachedInGridFSStrict(
        vcId: string,
        cid: string,
        timeoutMs: number = 60_000
    ): Promise<string> {
        const existing = await DataBaseHelper.gridFS.find({ filename: cid }).toArray();
        if (existing && existing.length > 0) {
            return existing[0]._id.toString();
        }

        const fileBuffer = await IPFSService.getFile(cid, timeoutMs);

        const gridFsId = await new Promise<string>((resolve, reject) => {
            const upload = DataBaseHelper.gridFS.openUploadStream(cid, {
                metadata: { contentType: 'text/csv; charset=utf-8' }
            });

            const timer = setTimeout(() => {
                reject(new Error(`GridFS upload timeout for cid=${cid}`));
            }, Math.max(30_000, Math.floor(timeoutMs * 0.8)));

            upload.once('finish', () => {
                clearTimeout(timer);
                resolve(String(upload.id));
            });

            upload.once('error', (err) => {
                clearTimeout(timer);
                reject(err instanceof Error ? err : new Error(String(err)));
            });

            upload.end(fileBuffer);
        });

        return gridFsId;
    }

    private findVcCid(files: unknown, fileMap: Map<string, string>): string | null {
        if (!Array.isArray(files)) {
            return null;
        }

        for (const cidCandidate of files) {
            if (typeof cidCandidate !== 'string') {
                continue;
            }

            const content = fileMap.get(cidCandidate);

            if (!content) {
                continue;
            }

            const parsed = this.parseFile(content);

            const hasSubject = Boolean(parsed && parsed.credentialSubject);
            const hasTypeArray =
                Array.isArray(parsed?.type) &&
                parsed.type.includes('VerifiableCredential');
            const hasTypeScalar =
                typeof parsed?.type === 'string' &&
                parsed.type === 'VerifiableCredential';

            if (hasSubject || hasTypeArray || hasTypeScalar) {
                return cidCandidate;
            }
        }

        return null;
    }
}
