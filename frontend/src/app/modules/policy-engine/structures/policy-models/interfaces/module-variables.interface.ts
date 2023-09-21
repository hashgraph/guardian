import { PolicyFolder } from "./types";
import { GroupVariables } from "../variables/group-variables";
import { RoleVariables } from "../variables/role-variables";
import { SchemaVariables } from "../variables/schema-variables";
import { TokenTemplateVariables } from "../variables/token-template-variables";
import { TokenVariables } from "../variables/token-variables";
import { TopicVariables } from "../variables/topic-variables";
import { ToolVariables } from "../variables/tool-variables";

export interface IModuleVariables {
    module: PolicyFolder | undefined;
    schemas: SchemaVariables[];
    tokens: TokenVariables[];
    tokenTemplates: TokenTemplateVariables[];
    roles: RoleVariables[];
    groups: GroupVariables[];
    topics: TopicVariables[];
    tools: ToolVariables[];
}