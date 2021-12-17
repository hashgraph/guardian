import {GetBlockByType} from '../blocks/get-block-by-type';
import {PolicyBlockConstructorParams, PolicyBlockFullArgumentList} from '@policy-engine/interfaces/block-options';
import {StateContainer} from '../state-container';
import {GetOtherOptions} from './get-other-options';

export namespace PolicyBlockHelpers {
    /**
     * Configure new block instance
     * @param policyId
     * @param blockType
     * @param options
     * @param skipRegistration
     */
    export function ConfigureBlock(policyId: string, blockType: string,
                                   options: Partial<PolicyBlockConstructorParams>,
                                   skipRegistration?: boolean): any {
        console.log('sckipRegistration', skipRegistration);
        if (options.options) {
            options = Object.assign(options, options.options);
        }
        const blockConstructor = GetBlockByType(blockType) as any;
        const instance = new blockConstructor(
            options.id || StateContainer.GenerateNewUUID(),
            options.defaultActive,
            options.tag,
            options.permissions,
            options.dependencies,
            options._parent,
            GetOtherOptions(options as PolicyBlockFullArgumentList)
        );
        if (!skipRegistration) {
            StateContainer.RegisterComponent(policyId, instance);
        }
        return instance;
    }

    /**
     * Return block instance reference
     * @param obj
     */
    export function GetBlockRef(obj: any): any {
        return obj as any;
    }

    /**
     * Return block options object
     * @param obj
     */
    export function GetBlockUniqueOptionsObject(obj: any): { [key: string]: any } {
        return obj.options;
    }
}
