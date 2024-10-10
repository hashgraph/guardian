export interface IProject {
    id: string;
    policyId: string;
    policyName: string;
    registered: Date;
    title: string;
    companyName: string;
    sectoralScope: string;
    document: {
        credentialSubject: ICredentialSubject[];
    };
}

interface ICredentialSubject {
    name: string;
}
