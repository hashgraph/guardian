import { Observable } from 'rxjs';
import { IPFS_SCHEMA } from 'src/app/services/api';
import { CommentsService } from 'src/app/services/comments.service';

interface IFile {
    name: string;
    type: string;
    fileType: string;
    size: number;
    link: string;
    cid: string;
}

export class AttachedFile {
    public readonly name: string;
    public readonly type: string;
    public readonly size: number;

    public readonly policyId: string;
    public readonly documentId: string;
    public readonly discussionId: string;

    public link: string;
    public cid: string;
    public loaded: boolean;
    public error: boolean;
    public loading: boolean;

    private _file: File;

    private constructor(
        policyId: string,
        documentId: string,
        discussionId: string,
        file: File | IFile
    ) {
        this.policyId = policyId;
        this.documentId = documentId;
        this.discussionId = discussionId;
        this.name = file.name;
        this.type = (file as any).fileType || file.type;
        this.size = file.size;
        this.link = '';
        this.cid = '';
        this.loaded = false;
        this.error = false;
        this.loaded = false;
    }

    public static fromFile(
        policyId: string,
        documentId: string,
        discussionId: string,
        file: File
    ) {
        const result = new AttachedFile(policyId, documentId, discussionId, file);
        result._file = file;
        result.link = '';
        result.cid = '';
        return result;
    }

    public static fromLink(
        policyId: string,
        documentId: string,
        discussionId: string,
        file: IFile
    ) {
        const result = new AttachedFile(policyId, documentId, discussionId, file);
        result.link = file.link;
        result.cid = file.cid;
        return result;
    }

    public upload(service: CommentsService): Observable<string> {
        this.loaded = false;
        this.error = false;
        return new Observable<string>((subscriber) => {
            service.addFile(this.policyId, this.documentId, this.discussionId, this._file)
                .subscribe((res) => {
                    this.link = IPFS_SCHEMA + res;
                    this.cid = res;
                    this.loaded = true;
                    this.error = false;
                    subscriber.next(this.cid);
                    subscriber.complete();
                }, (error) => {
                    this.loaded = true;
                    this.error = true;
                    subscriber.error(error);
                });

        });
    }

    public download(service: CommentsService): Observable<ArrayBuffer> {
        this.loading = true;
        return new Observable<ArrayBuffer>((subscriber) => {
            service.getFile(this.policyId, this.documentId, this.discussionId, this.cid)
                .subscribe((response: ArrayBuffer) => {
                    this.loading = false;
                    this.error = false;
                    this.loaded = true;
                    subscriber.next(response);
                    subscriber.complete();
                }, (error) => {
                    this.loading = false;
                    this.error = true;
                    subscriber.error(error);
                });
        });
    }

    public toJSON(): IFile {
        return {
            name: this.name,
            type: this.type,
            fileType: this.type,
            size: this.size,
            link: this.link,
            cid: this.cid,
        };
    }
}
