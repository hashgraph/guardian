import {
    ApprovalDocument,
    BlockState,
    DataBaseHelper,
    DidDocument,
    DocumentState,
    ExternalDocument,
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

    public static async unZipFile(buffer: any): Promise<string> {
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

        let index = 0;
        const version = FileHelper._readString(FileHeaders.VERSION, lines[index++]);
        if (!version) {
            throw Error('Invalid version');
        }

        const lastUpdate = FileHelper._readDate(FileHeaders.DATE, lines[index++]);
        const type = FileHelper._readString(FileHeaders.TYPE, lines[index++]);

        if (type !== 'backup' && type !== 'diff') {
            throw Error('Invalid type');
        }

        //VcDocument
        FileHelper._readString(FileHeaders.COLLECTION, lines[index++]);
        const vcCollectionSize = FileHelper._readNumber(FileHeaders.SIZE, lines[index++]);
        const vcCollectionStart = index;
        const vcCollectionEnd = index + vcCollectionSize + 1;
        const vcCollection = FileHelper._decryptCollection<VcDocument>(lines, vcCollectionStart, vcCollectionEnd);
        index = vcCollectionEnd;

        //VpDocument
        FileHelper._readString(FileHeaders.COLLECTION, lines[index++]);
        const vpCollectionSize = FileHelper._readNumber(FileHeaders.SIZE, lines[index++]);
        const vpCollectionStart = index;
        const vpCollectionEnd = index + vpCollectionSize + 1;
        const vpCollection = FileHelper._decryptCollection<VpDocument>(lines, vpCollectionStart, vpCollectionEnd);
        index = vpCollectionEnd;

        //DidDocument
        FileHelper._readString(FileHeaders.COLLECTION, lines[index++]);
        const didCollectionSize = FileHelper._readNumber(FileHeaders.SIZE, lines[index++]);
        const didCollectionStart = index;
        const didCollectionEnd = index + didCollectionSize + 1;
        const didCollection = FileHelper._decryptCollection<DidDocument>(lines, didCollectionStart, didCollectionEnd);
        index = didCollectionEnd;

        //BlockState
        FileHelper._readString(FileHeaders.COLLECTION, lines[index++]);
        const stateCollectionSize = FileHelper._readNumber(FileHeaders.SIZE, lines[index++]);
        const stateCollectionStart = index;
        const stateCollectionEnd = index + stateCollectionSize + 1;
        const stateCollection = FileHelper._decryptCollection<BlockState>(lines, stateCollectionStart, stateCollectionEnd);
        index = stateCollectionEnd;

        //PolicyRoles
        FileHelper._readString(FileHeaders.COLLECTION, lines[index++]);
        const roleCollectionSize = FileHelper._readNumber(FileHeaders.SIZE, lines[index++]);
        const roleCollectionStart = index;
        const roleCollectionEnd = index + roleCollectionSize + 1;
        const roleCollection = FileHelper._decryptCollection<PolicyRoles>(lines, roleCollectionStart, roleCollectionEnd);
        index = roleCollectionEnd;

        //MultiDocuments
        FileHelper._readString(FileHeaders.COLLECTION, lines[index++]);
        const multiDocCollectionSize = FileHelper._readNumber(FileHeaders.SIZE, lines[index++]);
        const multiDocCollectionStart = index;
        const multiDocCollectionEnd = index + multiDocCollectionSize + 1;
        const multiDocCollection = FileHelper._decryptCollection<MultiDocuments>(lines, multiDocCollectionStart, multiDocCollectionEnd);
        index = multiDocCollectionEnd;

        //Token
        FileHelper._readString(FileHeaders.COLLECTION, lines[index++]);
        const tokenCollectionSize = FileHelper._readNumber(FileHeaders.SIZE, lines[index++]);
        const tokenCollectionStart = index;
        const tokenCollectionEnd = index + tokenCollectionSize + 1;
        const tokenCollection = FileHelper._decryptCollection<Token>(lines, tokenCollectionStart, tokenCollectionEnd);
        index = tokenCollectionEnd;

        //Tag
        FileHelper._readString(FileHeaders.COLLECTION, lines[index++]);
        const tagCollectionSize = FileHelper._readNumber(FileHeaders.SIZE, lines[index++]);
        const tagCollectionStart = index;
        const tagCollectionEnd = index + tagCollectionSize + 1;
        const tagCollection = FileHelper._decryptCollection<Tag>(lines, tagCollectionStart, tagCollectionEnd);
        index = tagCollectionEnd;

        //DocumentState
        FileHelper._readString(FileHeaders.COLLECTION, lines[index++]);
        const docStateCollectionSize = FileHelper._readNumber(FileHeaders.SIZE, lines[index++]);
        const docStateCollectionStart = index;
        const docStateCollectionEnd = index + docStateCollectionSize + 1;
        const docStateCollection = FileHelper._decryptCollection<DocumentState>(lines, docStateCollectionStart, docStateCollectionEnd);
        index = docStateCollectionEnd;

        //Topic
        FileHelper._readString(FileHeaders.COLLECTION, lines[index++]);
        const topicCollectionSize = FileHelper._readNumber(FileHeaders.SIZE, lines[index++]);
        const topicCollectionStart = index;
        const topicCollectionEnd = index + topicCollectionSize + 1;
        const topicCollection = FileHelper._decryptCollection<Topic>(lines, topicCollectionStart, topicCollectionEnd);
        index = topicCollectionEnd;

        //ExternalDocument
        FileHelper._readString(FileHeaders.COLLECTION, lines[index++]);
        const externalDocCollectionSize = FileHelper._readNumber(FileHeaders.SIZE, lines[index++]);
        const externalDocCollectionStart = index;
        const externalDocCollectionEnd = index + externalDocCollectionSize + 1;
        const externalDocCollection = FileHelper._decryptCollection<ExternalDocument>(lines, externalDocCollectionStart, externalDocCollectionEnd);
        index = externalDocCollectionEnd;

        //ApprovalDocument
        FileHelper._readString(FileHeaders.COLLECTION, lines[index++]);
        const approveCollectionSize = FileHelper._readNumber(FileHeaders.SIZE, lines[index++]);
        const approveCollectionStart = index;
        const approveCollectionEnd = index + approveCollectionSize + 1;
        const approveCollection = FileHelper._decryptCollection<ApprovalDocument>(lines, approveCollectionStart, approveCollectionEnd);
        index = approveCollectionEnd;

        const diff: IPolicyDiff = {
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
        }

        return diff
    }

    private static _decryptCollection<T extends RestoreEntity>(
        lines: string[],
        start: number,
        end: number
    ): ICollectionDiff<T> {
        const hash = FileHelper._readString(FileHeaders.HASH, lines[start++]);
        const fullHash = FileHelper._readString(FileHeaders.HASH, lines[start++]);
        const actions: IDiffAction<T>[] = [];
        for (let index = start; index < end; index++) {
            const action = FileHelper._decryptAction<T>(lines[index]);
            if (!action) {
                throw Error('Invalid action');
            }
            actions.push(action);
        }
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

    private static _readString(header: FileHeaders, line: string): string {
        if (line.startsWith(header)) {
            return line.substring(header.length);
        } else {
            return null;
        }
    }

    private static _readNumber(header: FileHeaders, line: string): number {
        if (line.startsWith(header)) {
            const number = line.substring(header.length);
            return Number(number);
        } else {
            return null;
        }
    }
    private static _readDate(header: FileHeaders, line: string): Date {
        if (line.startsWith(header)) {
            const date = line.substring(header.length);
            return new Date(date);
        } else {
            return null;
        }
    }

    public static encryptFile(diff: IPolicyDiff): string {
        let result = '';
        result += FileHelper._writeString(FileHeaders.VERSION, '1.0.0');
        result += FileHelper._writeDate(FileHeaders.DATE, diff.lastUpdate);
        result += FileHelper._writeString(FileHeaders.TYPE, diff.type);

        //VcDocument
        result += FileHelper._writeString(FileHeaders.COLLECTION, 'VcDocument');
        result += FileHelper._writeNumber(FileHeaders.SIZE, diff.vcCollection.actions.length);
        result += FileHelper._encryptCollection(diff.vcCollection);

        //VpDocument
        result += FileHelper._writeString(FileHeaders.COLLECTION, 'VpDocument');
        result += FileHelper._writeNumber(FileHeaders.SIZE, diff.vpCollection.actions.length);
        result += FileHelper._encryptCollection(diff.vpCollection);

        //DidDocument
        result += FileHelper._writeString(FileHeaders.COLLECTION, 'DidDocument');
        result += FileHelper._writeNumber(FileHeaders.SIZE, diff.didCollection.actions.length);
        result += FileHelper._encryptCollection(diff.didCollection);

        //BlockState
        result += FileHelper._writeString(FileHeaders.COLLECTION, 'BlockState');
        result += FileHelper._writeNumber(FileHeaders.SIZE, diff.stateCollection.actions.length);
        result += FileHelper._encryptCollection(diff.stateCollection);

        //PolicyRoles
        result += FileHelper._writeString(FileHeaders.COLLECTION, 'PolicyRoles');
        result += FileHelper._writeNumber(FileHeaders.SIZE, diff.roleCollection.actions.length);
        result += FileHelper._encryptCollection(diff.roleCollection);

        //MultiDocuments
        result += FileHelper._writeString(FileHeaders.COLLECTION, 'MultiDocuments');
        result += FileHelper._writeNumber(FileHeaders.SIZE, diff.multiDocCollection.actions.length);
        result += FileHelper._encryptCollection(diff.multiDocCollection);

        //Token
        result += FileHelper._writeString(FileHeaders.COLLECTION, 'Token');
        result += FileHelper._writeNumber(FileHeaders.SIZE, diff.tokenCollection.actions.length);
        result += FileHelper._encryptCollection(diff.tokenCollection);

        //Tag
        result += FileHelper._writeString(FileHeaders.COLLECTION, 'Tag');
        result += FileHelper._writeNumber(FileHeaders.SIZE, diff.tagCollection.actions.length);
        result += FileHelper._encryptCollection(diff.tagCollection);

        //DocumentState
        result += FileHelper._writeString(FileHeaders.COLLECTION, 'DocumentState');
        result += FileHelper._writeNumber(FileHeaders.SIZE, diff.docStateCollection.actions.length);
        result += FileHelper._encryptCollection(diff.docStateCollection);

        //Topic
        result += FileHelper._writeString(FileHeaders.COLLECTION, 'Topic');
        result += FileHelper._writeNumber(FileHeaders.SIZE, diff.topicCollection.actions.length);
        result += FileHelper._encryptCollection(diff.topicCollection);

        //ExternalDocument
        result += FileHelper._writeString(FileHeaders.COLLECTION, 'ExternalDocument');
        result += FileHelper._writeNumber(FileHeaders.SIZE, diff.externalDocCollection.actions.length);
        result += FileHelper._encryptCollection(diff.externalDocCollection);

        //ApprovalDocument
        result += FileHelper._writeString(FileHeaders.COLLECTION, 'ApprovalDocument');
        result += FileHelper._writeNumber(FileHeaders.SIZE, diff.approveCollection.actions.length);
        result += FileHelper._encryptCollection(diff.approveCollection);

        return result;
    }

    public static _encryptCollection<T extends RestoreEntity>(collection: ICollectionDiff<T>): string {
        let result = '';
        result += FileHelper._writeString(FileHeaders.HASH, collection.hash);
        result += FileHelper._writeString(FileHeaders.HASH, collection.fullHash);
        for (const action of collection.actions) {
            result += FileHelper._encryptAction<T>(action);
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
        return header + (value).toISOString() + FileHeaders.NEW_LINE;
    }
}