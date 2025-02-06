import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { IPolicyAddonBlock, IPolicyDocument } from '../policy-engine.interface.js';
import { ChildrenType, ControlType } from '../interfaces/block-about.js';
import { PolicyUser } from '../policy-user.js';
import { fileURLToPath } from 'url';
import { Worker } from 'node:worker_threads';
import { BasicBlock } from '../helpers/decorators/basic-block.js';
import path from 'path';

const filename = fileURLToPath(import.meta.url);

@BasicBlock({
    blockType: 'dataTransformationAddon',
    commonBlock: true,
    about: {
        label: 'Data Transformation Addon',
        title: `Add 'Data Transformation' Addon`,
        post: true,
        get: true,
        children: ChildrenType.Special,
        control: ControlType.Special,
        input: null,
        output: null,
        defaultEvent: false,
    },
    variables: []
})
export class DataTransformationAddon {
    async getTransformedData(transformationBlock: IPolicyAddonBlock,user: PolicyUser, data: any) {
        return new Promise<IPolicyDocument | IPolicyDocument[]>(async (resolve, reject) => {
            const importCode = `const [done, user, documents] = arguments;\r\n`;
            const expression = transformationBlock.options.expression || '';
            const worker = new Worker(path.join(path.dirname(filename), '..', 'helpers', 'data-transformation-addon-worker.js'), {
                workerData: {
                    execFunc: `${importCode}${expression}`,
                    user,
                    documents: data,
                },
            });

            const done = async (result: any | any[], final: boolean) => {
                if (!result) {
                    if (final) {
                        resolve(null);
                    }
                    return;
                }
                resolve(result);
            }

            worker.on('error', (error) => {
                reject(error);
            });
            worker.on('message', async (result: any) => {
                try {
                    await done(result.result, result.final);
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    async getData(user: PolicyUser, uuid: string, queryParams: any) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyAddonBlock>(this);
        const parentBlock:IPolicyAddonBlock = ref.parent as IPolicyAddonBlock;
        if(parentBlock) {
            const parentData = await parentBlock.getData(user, uuid, queryParams);
            return await this.getTransformedData(ref, user, parentData.data);
        }
    }
}
