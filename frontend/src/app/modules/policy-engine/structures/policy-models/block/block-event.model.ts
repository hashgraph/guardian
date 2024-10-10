import { GenerateUUIDv4 } from '@guardian/interfaces';
import { PolicyBlock } from './block.model';
import { IEventConfig } from '../interfaces/event-config.interface';

export class PolicyEvent {
    private readonly block: PolicyBlock;

    public readonly id: string;

    private _actor: string;
    private _disabled: boolean;
    private _input: string;
    private _output: string;
    private _source: PolicyBlock | null;
    private _sourceTag: string;
    private _target: PolicyBlock | null;
    private _targetTag: string;
    private _changed: boolean;

    public default: boolean;

    constructor(event: IEventConfig, block: PolicyBlock) {
        this.default = false;

        this._changed = false;

        this.block = block;
        this.id = event.id || GenerateUUIDv4();

        this._actor = event.actor || '';
        this._disabled = !!event.disabled;
        this._input = event.input || '';
        this._output = event.output || '';

        if (typeof event.source == 'string') {
            this._source = null;
            this._sourceTag = event.source || '';
        } else {
            this._source = event.source;
            this._sourceTag = '';
        }

        if (typeof event.target == 'string') {
            this._target = null;
            this._targetTag = event.target || '';
        } else {
            this._target = event.target;
            this._targetTag = '';
        }
    }
    public get actor(): string {
        return this._actor;
    }

    public set actor(value: string) {
        this._actor = value;
        this.changed = true;
    }

    public get disabled(): boolean {
        return this._disabled;
    }

    public set disabled(value: boolean) {
        this._disabled = value;
        this.changed = true;
    }

    public get input(): string {
        return this._input;
    }

    public set input(value: string) {
        this._input = value;
        this.changed = true;
    }

    public get output(): string {
        return this._output;
    }

    public set output(value: string) {
        this._output = value;
        this.changed = true;
    }

    public get source(): PolicyBlock | null {
        return this._source;
    }

    public set source(value: PolicyBlock | null) {
        this._source = value;
        this.changed = true;
    }

    public get sourceTag(): string {
        if (this._source) {
            return this._source.tag;
        }
        return this._sourceTag;
    }

    public set sourceTag(value: string) {
        this._sourceTag = value;
    }

    public get target(): PolicyBlock | null {
        return this._target;
    }

    public set target(value: PolicyBlock | null) {
        this._target = value;
        this.changed = true;
    }

    public get targetTag(): string {
        if (this._target) {
            return this._target.tag;
        }
        return this._targetTag;
    }

    public set targetTag(value: string) {
        this._targetTag = value;
    }

    public get changed(): boolean {
        return this._changed;
    }

    public set changed(value: boolean) {
        this._changed = value;
        if (this.block) {
            this.block.changed = true;
        }
    }

    public emitUpdate() {
        this._changed = false;
        this.block.emitUpdate();
    }

    public getJSON(): any {
        const json = {
            target: this.targetTag,
            source: this.sourceTag,
            input: this.input,
            output: this.output,
            actor: this.actor,
            disabled: this.disabled
        };
        return json;
    }

    public check(block: PolicyBlock): boolean {
        return block.id == this.target?.id || block.id == this.source?.id;
    }

    public isTarget(block: PolicyBlock): boolean {
        return block.id == this.target?.id && block.id != this.source?.id;
    }

    public isSource(block: PolicyBlock): boolean {
        return block.id == this.source?.id;
    }

    public remove() {
        if (this.block) {
            this.block._removeEvent(this);
            this.block.refresh();
        }
    }

    public checkChange() {
        if (this._changed) {
            this.emitUpdate();
        }
    }
}
