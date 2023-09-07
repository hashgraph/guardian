import { PolicyBlock } from "../block/block.model";
import { PolicyModule } from "../module/block.model";
import { ModuleTemplate } from "../module/template.model";
import { PolicyTemplate } from "../policy/policy.model";

export type PolicyFolder = PolicyTemplate | ModuleTemplate | PolicyModule;
export type PolicyRoot = PolicyTemplate | ModuleTemplate;
export type PolicyItem = PolicyModule | PolicyBlock;