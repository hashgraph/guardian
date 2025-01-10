export interface IMethodologyConfig {

}

export interface IMethodology {
    id?: string;
    name?: string;
    description?: string;
    policyId?: string;
    policyTopicId?: string;
    owner?: string;
    status?: string;
    config?: IMethodologyConfig;
}