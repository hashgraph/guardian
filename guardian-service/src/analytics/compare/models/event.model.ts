import MurmurHash3 from 'imurmurhash';
import { BlockModel } from "./block.model";
import { ICompareOptions } from "../interfaces/compare-options.interface";

export class EventModel {
    public readonly actor: any;
    public readonly disabled: any;
    public readonly input: any;
    public readonly output: any;

    public readonly source: string;
    public readonly target: string;

    private _weight: string;
    public get weight(): string {
        return this._weight;
    }

    private start: string;
    private end: string;
    private hash: string;

    constructor(json: any) {
        this.actor = json.actor;
        this.disabled = json.disabled;
        this.input = json.input;
        this.output = json.output;

        this.source = json.source;
        this.target = json.target;
    }

    public calcWeight(
        source: BlockModel,
        target: BlockModel,
        options: ICompareOptions
    ): void {
        if (source) {
            this.start = source.getWeight();
        }
        if (target) {
            this.end = target.getWeight();
        }


        let hashState = MurmurHash3();
        if (this.start) {
            hashState.hash(this.start);
        }
        if (this.end) {
            hashState.hash(this.end);
        }
        hashState.hash(this.actor);
        hashState.hash(this.disabled);
        hashState.hash(this.input);
        hashState.hash(this.output);
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
            actor: this.actor,
            source: this.source,
            target: this.target,
            input: this.input,
            output: this.output,
            disabled: this.disabled,
            weight: this._weight,
            startWeight: this.start,
            endWeight: this.end,
        }
    }

    public equal(event: EventModel): boolean {
        return this.hash === event.hash;
    }
}
