import { IVariableData } from "@guardian/interfaces";

export class VariableData implements IVariableData {
    public id: string;
    public schemaId: string;
    public path: string;
    public schemaName: string;
    public schemaPath: string;
    public fieldType: string;
    public fieldRef: boolean;
    public fieldArray: boolean;
    public fieldDescription: string;
    public fieldProperty: string;
    public fieldPropertyName: string;

    public value: any;
    public isArray: boolean;

    constructor(item: IVariableData) {
        this.id = item.id;
        this.schemaId = item.schemaId;
        this.path = item.path;
        this.schemaName = item.schemaName;
        this.schemaPath = item.schemaPath;
        this.fieldType = item.fieldType;
        this.fieldRef = item.fieldRef;
        this.fieldArray = item.fieldArray;
        this.fieldDescription = item.fieldDescription;
        this.fieldProperty = item.fieldProperty;
        this.fieldPropertyName = item.fieldPropertyName;
    }

    public setValue(value: any): void {
        this.value = value;
        this.isArray = Array.isArray(value);
    }

    public static from(data?: IVariableData[]): VariableData[] {
        if (Array.isArray(data)) {
            return data.map((e) => new VariableData(e));
        }
        return [];
    }
}

