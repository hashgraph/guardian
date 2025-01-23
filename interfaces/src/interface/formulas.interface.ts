export interface IFormulaConfig {

}

export interface IFormula {
    id?: string;
    name?: string;
    description?: string;
    policyId?: string;
    policyTopicId?: string;
    owner?: string;
    status?: string;
    config?: IFormulaConfig;
}