import {
    ApprovalDocument,
    BlockState,
    DataBaseHelper,
    DidDocument,
    DocumentState,
    ExternalDocument,
    MintRequest,
    MintTransaction,
    MultiDocuments,
    PolicyRoles,
    RestoreEntity,
    Tag,
    Token,
    Topic,
    VcDocument,
    VpDocument
} from '@guardian/common';
import { ICollectionDiff, IDiffAction, IPolicyDiff } from './index.js';
import { ObjectId } from '@mikro-orm/mongodb';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import JSZip from 'jszip';

enum FileHeaders {
    NEW_LINE = '\n',
    VERSION = 'VERSION: ',
    DATE = 'DATE: ',
    TYPE = 'TYPE: ',
    COLLECTION = 'COLLECTION: ',
    SIZE = 'SIZE: ',
    HASH = 'HASH: ',
    UUID = 'UUID: ',
    INDEX = 'INDEX: ',
}

class Cursor {
    public index: number;

    constructor() {
        this.index = 0;
    }
}

export class FileHelper {
    public static readonly FileName: string = 'diff'

    public static async zipFile(file: string): Promise<ArrayBuffer> {
        const zip = new JSZip();
        zip.file(FileHelper.FileName, file);
        const buffer = await zip.generateAsync({
            type: 'arraybuffer',
            compression: 'DEFLATE',
            compressionOptions: {
                level: 3
            }
        });
        return buffer;
    }

    public static async unZipFile(buffer: ArrayBuffer): Promise<string> {
        const zip = new JSZip();
        const content = await zip.loadAsync(buffer);
        if (!content.files[FileHelper.FileName] || content.files[FileHelper.FileName].dir) {
            throw new Error('Zip file is not a diff');
        }
        const file = await content.files[FileHelper.FileName].async('string');
        return file;
    }

    public static async loadFile(id: ObjectId): Promise<IPolicyDiff | null> {
        if (!id) {
            return null;
        }
        const buffer = await DataBaseHelper.loadFile(id);
        if (!buffer) {
            return null;
        }
        const file = buffer.toString();
        const diff = FileHelper.decryptFile(file);
        return diff;
    }

    public static async saveFile(diff: IPolicyDiff): Promise<ObjectId> {
        const file = FileHelper.encryptFile(diff);
        const buffer = Buffer.from(file);
        const id = await DataBaseHelper.saveFile(GenerateUUIDv4(), buffer);
        return id;
    }

    public static async deleteFile(id: ObjectId): Promise<void> {
        if (id) {
            DataBaseHelper.gridFS
                .delete(id)
                .catch(console.error);
        }
    }

    public static decryptFile(file: string): IPolicyDiff {
        const lines = file.split(FileHeaders.NEW_LINE);

        const cursor = new Cursor();
        const version = FileHelper._readString(FileHeaders.VERSION, lines, cursor);
        if (!version) {
            throw Error('Invalid version');
        }

        const lastUpdate = FileHelper._readDate(FileHeaders.DATE, lines, cursor);
        const uuid = FileHelper._readString(FileHeaders.UUID, lines, cursor);
        const index = FileHelper._readNumber(FileHeaders.INDEX, lines, cursor);
        const type = FileHelper._readString(FileHeaders.TYPE, lines, cursor);

        if (type !== 'backup' && type !== 'diff') {
            throw Error('Invalid type');
        }

        //VcDocument
        FileHelper._readString(FileHeaders.COLLECTION, lines, cursor);
        const vcCollectionSize = FileHelper._readNumber(FileHeaders.SIZE, lines, cursor);
        const vcCollection = FileHelper._decryptCollection<VcDocument>(lines, cursor, vcCollectionSize);

        //VpDocument
        FileHelper._readString(FileHeaders.COLLECTION, lines, cursor);
        const vpCollectionSize = FileHelper._readNumber(FileHeaders.SIZE, lines, cursor);
        const vpCollection = FileHelper._decryptCollection<VpDocument>(lines, cursor, vpCollectionSize);

        //DidDocument
        FileHelper._readString(FileHeaders.COLLECTION, lines, cursor);
        const didCollectionSize = FileHelper._readNumber(FileHeaders.SIZE, lines, cursor);
        const didCollection = FileHelper._decryptCollection<DidDocument>(lines, cursor, didCollectionSize);

        //BlockState
        FileHelper._readString(FileHeaders.COLLECTION, lines, cursor);
        const stateCollectionSize = FileHelper._readNumber(FileHeaders.SIZE, lines, cursor);
        const stateCollection = FileHelper._decryptCollection<BlockState>(lines, cursor, stateCollectionSize);

        //PolicyRoles
        FileHelper._readString(FileHeaders.COLLECTION, lines, cursor);
        const roleCollectionSize = FileHelper._readNumber(FileHeaders.SIZE, lines, cursor);
        const roleCollection = FileHelper._decryptCollection<PolicyRoles>(lines, cursor, roleCollectionSize);

        //MultiDocuments
        FileHelper._readString(FileHeaders.COLLECTION, lines, cursor);
        const multiDocCollectionSize = FileHelper._readNumber(FileHeaders.SIZE, lines, cursor);
        const multiDocCollection = FileHelper._decryptCollection<MultiDocuments>(lines, cursor, multiDocCollectionSize);

        //Token
        FileHelper._readString(FileHeaders.COLLECTION, lines, cursor);
        const tokenCollectionSize = FileHelper._readNumber(FileHeaders.SIZE, lines, cursor);
        const tokenCollection = FileHelper._decryptCollection<Token>(lines, cursor, tokenCollectionSize);

        //Tag
        FileHelper._readString(FileHeaders.COLLECTION, lines, cursor);
        const tagCollectionSize = FileHelper._readNumber(FileHeaders.SIZE, lines, cursor);
        const tagCollection = FileHelper._decryptCollection<Tag>(lines, cursor, tagCollectionSize);

        //DocumentState
        FileHelper._readString(FileHeaders.COLLECTION, lines, cursor);
        const docStateCollectionSize = FileHelper._readNumber(FileHeaders.SIZE, lines, cursor);
        const docStateCollection = FileHelper._decryptCollection<DocumentState>(lines, cursor, docStateCollectionSize);

        //Topic
        FileHelper._readString(FileHeaders.COLLECTION, lines, cursor);
        const topicCollectionSize = FileHelper._readNumber(FileHeaders.SIZE, lines, cursor);
        const topicCollection = FileHelper._decryptCollection<Topic>(lines, cursor, topicCollectionSize);

        //ExternalDocument
        FileHelper._readString(FileHeaders.COLLECTION, lines, cursor);
        const externalDocCollectionSize = FileHelper._readNumber(FileHeaders.SIZE, lines, cursor);
        const externalDocCollection = FileHelper._decryptCollection<ExternalDocument>(lines, cursor, externalDocCollectionSize);

        //ApprovalDocument
        FileHelper._readString(FileHeaders.COLLECTION, lines, cursor);
        const approveCollectionSize = FileHelper._readNumber(FileHeaders.SIZE, lines, cursor);
        const approveCollection = FileHelper._decryptCollection<ApprovalDocument>(lines, cursor, approveCollectionSize);

        //MintRequest
        FileHelper._readString(FileHeaders.COLLECTION, lines, cursor);
        const mintRequestCollectionSize = FileHelper._readNumber(FileHeaders.SIZE, lines, cursor);
        const mintRequestCollection = FileHelper._decryptCollection<MintRequest>(lines, cursor, mintRequestCollectionSize);

        //MintTransaction
        FileHelper._readString(FileHeaders.COLLECTION, lines, cursor);
        const mintTransactionCollectionSize = FileHelper._readNumber(FileHeaders.SIZE, lines, cursor);
        const mintTransactionCollection = FileHelper._decryptCollection<MintTransaction>(lines, cursor, mintTransactionCollectionSize);

        const diff: IPolicyDiff = {
            uuid,
            index,
            type,
            lastUpdate,
            vcCollection,
            vpCollection,
            didCollection,
            stateCollection,
            roleCollection,
            multiDocCollection,
            tokenCollection,
            tagCollection,
            docStateCollection,
            topicCollection,
            externalDocCollection,
            approveCollection,
            mintRequestCollection,
            mintTransactionCollection,
        }

        return diff
    }

    private static _decryptCollection<T extends RestoreEntity>(
        lines: string[],
        cursor: Cursor,
        size: number
    ): ICollectionDiff<T> {
        const hash = FileHelper._readString(FileHeaders.HASH, lines, cursor);
        const fullHash = FileHelper._readString(FileHeaders.HASH, lines, cursor);
        const actions: IDiffAction<T>[] = [];
        const start = cursor.index;
        const end = cursor.index + size;
        for (let index = start; index < end; index++) {
            const action = FileHelper._decryptAction<T>(lines[index]);
            if (!action) {
                throw Error('Invalid action');
            }
            actions.push(action);
        }
        cursor.index = end;
        const diff: ICollectionDiff<T> = {
            hash,
            fullHash,
            actions
        }
        return diff;
    }

    private static _decryptAction<T extends RestoreEntity>(line: string): IDiffAction<T> {
        if (line) {
            return JSON.parse(line);
        } else {
            return null;
        }
    }

    private static _readString(header: FileHeaders, lines: string[], cursor: Cursor): string {
        if (lines[cursor.index] && lines[cursor.index].startsWith(header)) {
            return lines[cursor.index++].substring(header.length);
        } else {
            return null;
        }
    }

    private static _readNumber(header: FileHeaders, lines: string[], cursor: Cursor): number {
        if (lines[cursor.index] && lines[cursor.index].startsWith(header)) {
            const _number = lines[cursor.index++].substring(header.length);
            return Number(_number);
        } else {
            return null;
        }
    }
    private static _readDate(header: FileHeaders, lines: string[], cursor: Cursor): Date {
        if (lines[cursor.index] && lines[cursor.index].startsWith(header)) {
            const _date = lines[cursor.index++].substring(header.length);
            return _date ? (new Date(_date)) : null;
        } else {
            return null;
        }
    }

    public static encryptFile(diff: IPolicyDiff): string {
        let result = '';
        result += FileHelper._writeString(FileHeaders.VERSION, '1.0.0');
        result += FileHelper._writeDate(FileHeaders.DATE, diff.lastUpdate);
        result += FileHelper._writeString(FileHeaders.UUID, diff.uuid);
        result += FileHelper._writeNumber(FileHeaders.INDEX, diff.index);
        result += FileHelper._writeString(FileHeaders.TYPE, diff.type);
        result += FileHelper._writeCollection('VcDocument', diff.vcCollection);
        result += FileHelper._writeCollection('VpDocument', diff.vpCollection);
        result += FileHelper._writeCollection('DidDocument', diff.didCollection);
        result += FileHelper._writeCollection('BlockState', diff.stateCollection);
        result += FileHelper._writeCollection('PolicyRoles', diff.roleCollection);
        result += FileHelper._writeCollection('MultiDocuments', diff.multiDocCollection);
        result += FileHelper._writeCollection('Token', diff.tokenCollection);
        result += FileHelper._writeCollection('Tag', diff.tagCollection);
        result += FileHelper._writeCollection('DocumentState', diff.docStateCollection);
        result += FileHelper._writeCollection('Topic', diff.topicCollection);
        result += FileHelper._writeCollection('ExternalDocument', diff.externalDocCollection);
        result += FileHelper._writeCollection('ApprovalDocument', diff.approveCollection);
        result += FileHelper._writeCollection('MintRequest', diff.mintRequestCollection);
        result += FileHelper._writeCollection('MintTransaction', diff.mintTransactionCollection);

        return result;
    }

    private static _writeCollection<T extends RestoreEntity>(
        name: string,
        collection: ICollectionDiff<T>
    ): string {
        let result = '';
        result += FileHelper._writeString(FileHeaders.COLLECTION, name);
        result += FileHelper._writeNumber(FileHeaders.SIZE, collection?.actions?.length || 0);
        result += FileHelper._encryptCollection(collection);
        return result;
    }

    public static _encryptCollection<T extends RestoreEntity>(collection: ICollectionDiff<T>): string {
        let result = '';
        result += FileHelper._writeString(FileHeaders.HASH, collection?.hash || '');
        result += FileHelper._writeString(FileHeaders.HASH, collection?.fullHash || '');
        if (collection) {
            for (const action of collection.actions) {
                result += FileHelper._encryptAction<T>(action);
            }
        }
        return result;
    }

    public static _encryptAction<T extends RestoreEntity>(action: IDiffAction<T>): string {
        if (action) {
            return JSON.stringify(action) + FileHeaders.NEW_LINE;
        } else {
            return '';
        }
    }

    private static _writeString(header: FileHeaders, value: string): string {
        return header + value + FileHeaders.NEW_LINE;
    }

    private static _writeNumber(header: FileHeaders, value: number): string {
        return header + value + FileHeaders.NEW_LINE;
    }
    private static _writeDate(header: FileHeaders, value: Date): string {
        return header + (value?.toISOString() || '') + FileHeaders.NEW_LINE;
    }
}