import { PolicyBlock } from "./block/block.model";
import { IBlockConfig } from "./interfaces/block-config.interface";
import { PolicyFolder, PolicyItem } from "./interfaces/types";
import { PolicyModule } from "./module/block.model";
import { PolicyTool } from "./tool/block.model";

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
        if (Array.isArray(config.children)) {
            for (const childConfig of config.children) {
                const child = TemplateUtils.buildBlock(childConfig, block, module);
                block.children.push(child);
            }
        }
        return block;
    }
}