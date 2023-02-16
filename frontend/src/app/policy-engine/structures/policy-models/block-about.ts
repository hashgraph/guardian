import { PolicyBlockModel } from "./policy-block.model";
import { IBlockAboutConfig } from "../interfaces/block-about-config.interface";
import { IBlockDynamicAboutConfig } from "../interfaces/block-dynamic-about-config.interface";
import { IBlockAbout } from "../interfaces/block-about.interface";

export class BlockAbout {
    private _propFunc: { [x: string]: Function; } = {};
    private _propVal: { [x: string]: any; } = {};
    private _setProp(about: any, dynamic: any, name: string) {
        this._propVal[name] = about[name];
        if (dynamic && dynamic[name]) {
            this._propFunc[name] = dynamic[name];
        } else {
            this._propFunc[name] = (value: any, block: any, prev?: IBlockAbout, next?: boolean) => {
                return this._propVal[name];
            };
        }
    }

    constructor(about: IBlockAboutConfig, dynamic?: IBlockDynamicAboutConfig) {
        this._setProp(about, dynamic, 'post');
        this._setProp(about, dynamic, 'get');
        this._setProp(about, dynamic, 'input');
        this._setProp(about, dynamic, 'output');
        this._setProp(about, dynamic, 'children');
        this._setProp(about, dynamic, 'control');
        this._setProp(about, dynamic, 'defaultEvent');
    }

    public get(block: PolicyBlockModel): IBlockAbout {
        return {
            post: this._propFunc.post(this._propVal.post, block),
            get: this._propFunc.get(this._propVal.get, block),
            input: this._propFunc.input(this._propVal.input, block),
            output: this._propFunc.output(this._propVal.output, block),
            children: this._propFunc.children(this._propVal.children, block),
            control: this._propFunc.control(this._propVal.control, block),
            defaultEvent: this._propFunc.defaultEvent(this._propVal.defaultEvent, block),
        };
    }

    public bind(block: PolicyBlockModel, prev?: IBlockAbout, next?: boolean): IBlockAbout {
        const bind = {
            _block: block,
            _prev: prev,
            _next: next,
            _func: this._propFunc,
            _val: this._propVal,
            get post() {
                return this._func.post(this._val.post, this._block, this._prev, this._next);
            },
            get get() {
                return this._func.get(this._val.get, this._block, this._prev, this._next);
            },
            get input() {
                return this._func.input(this._val.input, this._block, this._prev, this._next);
            },
            get output() {
                return this._func.output(this._val.output, this._block, this._prev, this._next);
            },
            get children() {
                return this._func.children(this._val.children, this._block, this._prev, this._next);
            },
            get control() {
                return this._func.control(this._val.control, this._block, this._prev, this._next);
            },
            get defaultEvent() {
                return this._func.defaultEvent(this._val.defaultEvent, this._block, this._prev, this._next);
            },
            set prev(value: IBlockAbout) {
                this._prev = value;
            },
            set next(value: boolean) {
                this._next = value;
            }
        };
        return bind;
    }
}
