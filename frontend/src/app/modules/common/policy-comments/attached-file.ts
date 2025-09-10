import { IPFS_SCHEMA } from 'src/app/services/api';
import { IPFSService } from 'src/app/services/ipfs.service';

export class AttachedFile {
    public readonly name: string;
    public readonly type: string;
    public readonly size: number;
    public link: string;
    public cid: string;
    public loaded: boolean;
    public error: boolean;

    private readonly _file: File;

    constructor(file: File) {
        this.name = file.name;
        this.type = file.type;
        this.size = file.size;
        this.link = '';
        this.cid = '';
        this.loaded = false;
        this.error = false;
        this._file = file;
    }

    public upload(
        ipfs: IPFSService,
        policyId?: string,
        dryRun?: boolean,
        callback?: Function
    ) {
        this.loaded = false;
        this.error = false;
        let addFileObs;
        if (dryRun && policyId) {
            addFileObs = ipfs.addFileDryRun(this._file, policyId);
        } else {
            addFileObs = ipfs.addFile(this._file);
        }
        addFileObs
            .subscribe((res) => {
                this.link = IPFS_SCHEMA + res;
                this.cid = res;
                this.loaded = true;
                this.error = false;
                if (callback) {
                    callback();
                }
            }, (error) => {
                this.loaded = true;
                this.error = true;
                if (callback) {
                    callback();
                }
            });
    }

    public toJSON() {
        return {
            name: this.name,
            type: this.type,
            size: this.size,
            link: this.link,
            cid: this.cid,
        };
    }
}
