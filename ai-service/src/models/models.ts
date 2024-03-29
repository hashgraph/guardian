export interface Methodology {
    id: string,
    label: string,
    text: string,
    url?: string
}

export interface ResponseData {
    answerBefore: string;
    answerAfter: string;
    items: Methodology[]
}

export interface PolicyDescription {
    policyId: string,
    descriptions: string[]
}
