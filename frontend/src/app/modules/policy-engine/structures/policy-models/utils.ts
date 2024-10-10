import { PolicyBlock } from './block/block.model';
import { IBlockConfig } from './interfaces/block-config.interface';
import { PolicyFolder, PolicyItem } from './interfaces/types';
import { PolicyModule } from './module/block.model';
import { PolicyTool } from './tool/block.model';
import { SchemaVariables } from './variables/schema-variables';

export class TemplateUtils {
    public static buildBlock(
        config: IBlockConfig,
        parent: PolicyItem | null,
        module: PolicyFolder
    ): PolicyItem {
        let block: PolicyItem;
        if (config.blockType === 'module') {
            block = new PolicyModule(config, parent);
            block.setModule(module);
            module = block as PolicyModule;
        } else if (config.blockType === 'tool') {
            block = new PolicyTool(config, parent);
            block.setModule(module);
            module = block as PolicyTool;
        } else {
            block = new PolicyBlock(config, parent);
            block.setModule(module);
        }
        if (parent && config.blockType === 'tool') {
            return block;
        } else {
            if (Array.isArray(config.children)) {
                for (const childConfig of config.children) {
                    const child = TemplateUtils.buildBlock(childConfig, block, module);
                    block.children.push(child);
                }
            }
            return block;
        }
    }

    public static checkSchemaVariables(variables: SchemaVariables[]): void {
        const map = new Set<string>([
            '#GeoJSON',
            '#SentinelHUB'
        ]);
        for (const variable of variables) {
            variable.disable = false;
            map.add(variable.value);
        }
        TemplateUtils._checkSchemaVariables(variables, map);
    }

    private static _checkSchemaVariables(variables: SchemaVariables[], map: Set<string>): void {
        for (const variable of variables) {
            if(!variable.disable && variable.defs && variable.defs.length) {
                for (const iri of variable.defs) {
                    if (!map.has(iri)) {
                        variable.disable = true;
                        map.delete(variable.value);
                        TemplateUtils._checkSchemaVariables(variables, map);
                        return;
                    }
                }
            }
        }
    }
}
