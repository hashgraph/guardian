import {DataSourceBlock} from '@policy-engine/helpers/decorators/data-source-block';
import {PolicyBlockHelpers} from '@policy-engine/helpers/policy-block-helpers';
import {BlockInitError} from '@policy-engine/errors';

@DataSourceBlock({
    blockType: 'informationBlock',
    commonBlock: false
})
export class InformationBlock {
    // async getData()
    // private updatePath(path: string, state, value: any): any {
    //     const newState = Object.assign({}, state);
    //     path.split('.').reduce((p, c, i, arr) => {
    //         if (i === (arr.length - 1)) {
    //             p[c] = value
    //         } else if (!p[c]) {
    //             p[c] = {};
    //         }
    //
    //         return p[c];
    //     }, newState);
    //
    //     return newState;
    // }
    //
    // @DependenciesUpdateHandler()
    // async handler(uuid, state, user, tag) {
    //     if (typeof this.options.rules === 'object') {
    //         for (let target in this.options.rules) {
    //             if (!this.options.rules.hasOwnProperty(target)) {
    //                 continue;
    //             }
    //             if (!this.options.rules[target].target) {
    //                 this.options.rules[target].target = this.options.rules[target].field;
    //             }
    //             const myState = StateContainer.GetBlockState(this.uuid, user)
    //             console.log('state', `try { return ${this.options.rules[target].field.split('.').reduce((p, c) => { return p + '[\'' + c + '\']'}, `${this.options.rules[target].expression}state`)} } catch(e) {throw new Error('Parsing rule error: ' + e.message);}`);
    //             const rule = new Function('state', `try { return ${this.options.rules[target].field.split('.').reduce((p, c) => { return p + '[\'' + c + '\']'}, `${this.options.rules[target].expression}state`)} } catch(e) {throw new Error('Parsing rule error: ' + e.message);}`);
    //             const curState = this.updatePath(this.options.rules[target].target, myState, rule(state));
    //             console.log(curState, user);
    //             await this.update(this.uuid, curState, user);
    //         }
    //     }
    // }
    //
    // @BlockStateUpdate()
    // async update(uuid: string, state: Partial<PolicyBlockStateData<any>>, user?: IAuthUser): Promise<PolicyBlockStateData<any>> {
    //     console.log(state, uuid);
    //
    //     return state as PolicyBlockStateData<any>;
    // }
    //
    // async getData(user: IAuthUser): Promise<any> {
    //     return {content: this.options.content};
    // }

    private init(): void {
        const {options, uuid, blockType} = PolicyBlockHelpers.GetBlockRef(this);

        if (!options.uiMetaData) {
            throw new BlockInitError(`Fileld "uiMetaData" is required`, blockType, uuid);
        }
    }

    async getData(user): Promise<any> {
        const {options} = PolicyBlockHelpers.GetBlockRef(this);
        return {uiMetaData: options.uiMetaData};
    }
}
