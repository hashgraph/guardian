import MurmurHash3 from 'imurmurhash';
import { ICompareOptions } from "../interfaces/compare-options.interface";
import { IArtifacts } from '../interfaces/artifacts.interface';

export class ArtifactModel {
    public readonly name: any;
    public readonly uuid: any;
    public readonly type: any;
    public readonly extension: any;

    private _weight: string;
    public get weight(): string {
        return this._weight;
    }

    private hash: string;

    constructor(json: any) {
        this.name = json.name;
        this.uuid = json.uuid;
        this.type = json.type;
        this.extension = json.extention;
    }

    public calcWeight(data: string, options: ICompareOptions): void {
        let hashState = MurmurHash3();
        hashState.hash(this.name);
        hashState.hash(this.type);
        hashState.hash(this.extension);
        hashState.hash(data);
        const weight = String(hashState.result());
        if (options.eventLvl > 0) {
            this._weight = weight;
        } else {
            this._weight = '';
        }
        this.hash = weight;
    }

    public toObject(): any {
        return {
            uuid: this.uuid,
            name: this.name,
            type: this.type,
            extension: this.extension,
            weight: this._weight,
        };
    }

    public equal(event: ArtifactModel): boolean {
        return this.hash === event.hash;
    }
}
