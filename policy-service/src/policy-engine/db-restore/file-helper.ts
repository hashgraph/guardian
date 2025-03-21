import { ICollectionDiff, IDiffAction, IPolicyDiff, Row, VC, VcCollectionBackup } from './index.js';

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

        //VC
        const vcCollectionName = FileHelper._readString(FileHeaders.COLLECTION, lines[index++]);
        const vcCollectionSize = FileHelper._readNumber(FileHeaders.SIZE, lines[index++]);
        const vcCollectionStart = index;
        const vcCollectionEnd = index + vcCollectionSize + 1;
        const vcCollection = FileHelper._decryptCollection<VC>(lines, vcCollectionStart, vcCollectionEnd);

        const diff: IPolicyDiff = {
            type,
            lastUpdate,
            vcCollection
        }

        return diff
    }

    private static _decryptCollection<T extends Row>(lines: string[], start: number, end: number): ICollectionDiff<T> {
        const hash = FileHelper._readString(FileHeaders.HASH, lines[start++]);
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
            actions
        }
        return diff;
    }

    private static _decryptAction<T extends Row>(line: string): IDiffAction<T> {
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


        //VC
        result += FileHelper._writeString(FileHeaders.COLLECTION, 'VC');
        result += FileHelper._writeNumber(FileHeaders.SIZE, diff.vcCollection.actions.length);
        result += FileHelper._encryptCollection(diff.vcCollection);

        return result;
    }

    public static _encryptCollection<T extends Row>(collection: ICollectionDiff<T>): string {
        let result = '';
        result += FileHelper._writeString(FileHeaders.HASH, collection.hash);
        for (const action of collection.actions) {
            result += FileHelper._encryptAction<T>(action);
        }
        return result;
    }

    public static _encryptAction<T extends Row>(action: IDiffAction<T>): string {
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