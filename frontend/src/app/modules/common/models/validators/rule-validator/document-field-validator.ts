import { ISchemaRuleData } from '@guardian/interfaces';

export class DocumentFieldVariable {
    public readonly id: string;
    public readonly schemaId: string;
    public readonly path: string;
    public readonly fullPah: string;
    public readonly fieldRef: boolean;
    public readonly fieldArray: boolean;
    public readonly fieldDescription: string;
    public readonly schemaName: string;

    constructor(variable: ISchemaRuleData) {
        this.id = variable.id;
        this.schemaId = variable.schemaId;
        this.path = variable.path;
        this.fullPah = variable.schemaId + '/' + variable.path;
        this.fieldRef = variable.fieldRef;
        this.fieldArray = variable.fieldArray;
        this.fieldDescription = variable.fieldDescription;
        this.schemaName = variable.schemaName;
    }
}