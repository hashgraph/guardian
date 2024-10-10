import { GenerateUUIDv4 } from '@guardian/interfaces';
import { PolicyTemplate } from './policy.model';
import { PolicyBlock } from '../block/block.model';

export class PolicyNavigationStepModel {
    private readonly policy: PolicyTemplate;

    public readonly id: string;

    private _name: string;
    private _block: PolicyBlock | null;
    private _blockTag: string;
    private _level: number;

    private _changed: boolean;

    constructor(
        config: {
            name: string;
            block: string | PolicyBlock | null;
            level: number;
        },
        policy: PolicyTemplate
    ) {
        this._changed = false;
        this.policy = policy;
        this.id = GenerateUUIDv4();
        this._name = config.name;
        this._level = config.level || 1;

        if (typeof config.block == 'string') {
            this._block = null;
            this._blockTag = config.block;
        } else {
            this._block = config.block;
            this._blockTag = '';
        }
    }

    public get name(): string {
        return this._name;
    }

    public get block(): PolicyBlock | null {
        return this._block;
    }

    public get level(): number {
        return this._level;
    }

    public set name(value: string) {
        this._name = value;
        this.changed = true;
    }

    public set block(value: PolicyBlock | null) {
        this._block = value;
        this.changed = true;
    }

    public set level(value: number) {
        this._level = value;
        this.changed = true;
    }

    public get blockTag(): string {
        if (this._block) {
            return this._block.tag;
        }
        return this._blockTag;
    }

    public set blockTag(value: string) {
        this._blockTag = value;
    }

    public get changed(): boolean {
        return this._changed;
    }

    public set changed(value: boolean) {
        this._changed = value;
        if (this.policy) {
            this.policy.changed = true;
        }
    }

    public emitUpdate() {
        this._changed = false;
        this.policy.emitUpdate();
    }

    public getJSON(): any {
        return {
            name: this._name,
            block: this.blockTag,
            level: this._level,
        };
    }

    public checkChange() {
        if (this._changed) {
            this.emitUpdate();
        }
    }
}
