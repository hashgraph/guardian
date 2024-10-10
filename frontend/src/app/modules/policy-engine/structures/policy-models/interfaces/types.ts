import { PolicyBlock } from "../block/block.model";
import { PolicyModule } from "../module/block.model";
import { ModuleTemplate } from "../module/template.model";
import { PolicyTemplate } from "../policy/policy.model";
import { PolicyTool } from "../tool/block.model";
import { ToolTemplate } from "../tool/template.model";

export type PolicyRoot = PolicyTemplate | ModuleTemplate | ToolTemplate;
export type PolicySubTree = PolicyModule | PolicyTool;
export type PolicyFolder = PolicyRoot | PolicySubTree;
export type PolicyItem = PolicySubTree | PolicyBlock;