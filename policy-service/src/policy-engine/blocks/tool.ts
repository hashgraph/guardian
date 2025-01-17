import { ContainerBlock } from '../helpers/decorators/container-block.js';
import { ChildrenType, ControlType } from '../interfaces/block-about.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { PolicyUser } from '../policy-user.js';
import { ActionCallback } from '../helpers/decorators/index.js';
import { IPolicyEvent } from '../interfaces/index.js';
import { PolicyInputEventType } from '../interfaces/policy-event-type.js';
import { IPolicyEventState } from '../policy-engine.interface.js';

/**
 * Container block with UI
 */
@ContainerBlock({
    blockType: 'tool',
    commonBlock: false,
    about: {
        label: 'Tool',
        title: `Add 'Tool' Block`,
        post: false,
        get: true,
        children: ChildrenType.Any,
        control: ControlType.UI,
        input: null,
        output: null,
        defaultEvent: false
    },
    variables: []
})
export class ToolBlock {
    /**
     * Input Events
     */
    public inputEvents: any[];
    /**
     * Output Events
     */
    public outputEvents: any[];

    /**
     * Init callback
     */
    beforeInit() {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        this.inputEvents = ref.options?.inputEvents || [];
        this.outputEvents = ref.options?.outputEvents || [];
    }

    /**
     * Get block data
     * @param user
     */
    async getData(user: PolicyUser): Promise<any> {
        return {};
    }

    /**
     * Action callback
     * @event PolicyEventType.ToolEvent
     * @param {IPolicyEvent} event
     */
    @ActionCallback({
        type: PolicyInputEventType.ToolEvent
    })
    async onAction(event: IPolicyEvent<IPolicyEventState>) {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        for (const e of this.inputEvents) {
            if (e.name === event.inputType) {
                ref.triggerEvents(e.name, event.user, event.data);
                return;
            }
        }
        for (const e of this.outputEvents) {
            if (e.name === event.inputType) {
                ref.triggerEvents(e.name, event.user, event.data);
                return;
            }
        }
        if (event.inputType === PolicyInputEventType.RefreshEvent) {
            ref.updateBlock(event.data, event.user, ref.tag);
        }
    }
    /**
     * Get variables
     * @param names variable name
     * @param type variable type
     */
    public getVariables(names: any[] | any, type: string): any {
        if (Array.isArray(names)) {
            const result = [];
            for (const name of names) {
                result.push(this._getVariable(name, type));
            }
            return result;
        } else {
            return this._getVariable(names, type);
        }
    }

    /**
     * Get variable
     * @param name variable name
     * @param type variable type
     */
    private _getVariable(name: any, type: string): any {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        if (Array.isArray(ref.options.variables)) {
            for (const variable of ref.options.variables) {
                if (type) {
                    if (name === variable.name && variable.type === type) {
                        return ref.options[variable.name];
                    }
                } else {
                    if (name === variable.name) {
                        return variable.value;
                    }
                }
            }
        }
        return name;
    }
}
