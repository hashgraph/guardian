import { PolicyBlockModel } from "./block.model";
import { IBlockAboutConfig } from "../interfaces/block-about-config.interface";
import { IBlockDynamicAboutConfig } from "../interfaces/block-dynamic-about-config.interface";
import { IBlockAbout } from "../interfaces/block-about.interface";
import { PolicyModel } from "./policy.model";
import { PolicyModuleModel } from "./module.model";

export class BlockAbout {
    private _propFunc: { [x: string]: Function; } = {};
    private _propVal: { [x: string]: any; } = {};
    private _setProp(about: any, dynamic: any, name: string) {
        this._propVal[name] = about[name];
        if (dynamic && dynamic[name] !== undefined && dynamic[name] !== null) {
            if (typeof dynamic[name] === 'function') {
                this._propFunc[name] = dynamic[name];
            } else {
                this._propVal[name] = dynamic[name];
                this._propFunc[name] = (value: any, block: any, module?: PolicyModel | PolicyModuleModel) => {
                    return value;
                };
            }
        } else {
            this._propFunc[name] = (value: any, block: any, module?: PolicyModel | PolicyModuleModel) => {
                return value;
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

    public getAbout(
        block: PolicyBlockModel,
        module: PolicyModel | PolicyModuleModel
    ): IBlockAbout {
        return {
            post: this._propFunc.post(this._propVal.post, block, module),
            get: this._propFunc.get(this._propVal.get, block, module),
            input: this._propFunc.input(this._propVal.input, block, module),
            output: this._propFunc.output(this._propVal.output, block, module),
            children: this._propFunc.children(this._propVal.children, block, module),
            control: this._propFunc.control(this._propVal.control, block, module),
            defaultEvent: this._propFunc.defaultEvent(this._propVal.defaultEvent, block, module),
        };
    }

    public bind(
        block: PolicyBlockModel,
        module: PolicyModel | PolicyModuleModel
    ): IBlockAbout {
        const bind = {
            _block: block,
            _module: module,
            _func: this._propFunc,
            _val: this._propVal,
            get post() {
                return this._func.post(this._val.post, this._block, this._module);
            },
            get get() {
                return this._func.get(this._val.get, this._block, this._module);
            },
            get input() {
                return this._func.input(this._val.input, this._block, this._module);
            },
            get output() {
                return this._func.output(this._val.output, this._block, this._module);
            },
            get children() {
                return this._func.children(this._val.children, this._block, this._module);
            },
            get control() {
                return this._func.control(this._val.control, this._block, this._module);
            },
            get defaultEvent() {
                return this._func.defaultEvent(this._val.defaultEvent, this._block, this._module);
            },
            set module(value: PolicyModel | PolicyModuleModel) {
                this._module = value;
            },
        };
        return bind;
    }
}
