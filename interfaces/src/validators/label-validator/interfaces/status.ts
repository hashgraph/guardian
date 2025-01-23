
export interface IValidateStatus {
    id: string;
    valid: boolean;
    error?: any;
    children?: IValidateStatus[];
}
