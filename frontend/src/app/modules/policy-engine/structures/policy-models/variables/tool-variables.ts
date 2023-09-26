import { ModuleVariable } from './module-variable.model';

export class ToolVariables {
    public name: string;
    public value: string;
    public description?: string;
    public owner?: string;
    public messageId?: string;
    public hash?: string;

    constructor(
        tool?: any | ModuleVariable | string,
        value?: string
    ) {
        if (typeof tool === 'string') {
            this.name = tool;
            this.value = tool;
        } else if (tool instanceof ModuleVariable) {
            this.name = tool.name;
            this.value = tool.name;
        } else if (tool) {
            this.name = tool.name || '';
            this.description = tool.description || '';
            this.owner = tool.owner || '';
            this.hash = tool.hash || '';
            this.messageId = tool.messageId || '';
            this.value = tool.messageId || '';
        } else {
            this.name = '';
            this.value = '';
        }
        if (value !== undefined) {
            this.value = value;
        }
    }
}
