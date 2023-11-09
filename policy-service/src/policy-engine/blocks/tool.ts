import { ContainerBlock } from '@policy-engine/helpers/decorators/container-block';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { IPolicyUser } from '@policy-engine/policy-user';
import { ActionCallback } from '@policy-engine/helpers/decorators';
import { IPolicyEvent } from '@policy-engine/interfaces';
import { PolicyInputEventType } from '@policy-engine/interfaces/policy-event-type';
import { IPolicyEventState } from '@policy-engine/policy-engine.interface';

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
    async getData(user: IPolicyUser): Promise<any> {
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
