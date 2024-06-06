export interface MeecoJwt {
    iat: number
    vp: Vp
    nbf: number
    aud: string
    nonce: string
    iss: string
}

export interface Vp {
    '@context': string[]
    type: string[]
    verifiableCredential: string[]
}

export interface VerifiableCredential {
    iat: number
    exp: number
    vc: Vc
    sub: string
    nbf: number
    iss: string
}

export interface CredentialStatus {
    id: string
    type: string
    statusPurpose: string
    statusListIndex: number
    statusListCredential: string
}

export interface Vc {
    '@context': string[]
    id: string
    type: string[]
    issuer: Issuer
    credentialSubject: CredentialSubject
    issuanceDate: string
    credentialSchema: CredentialSchema
    expirationDate: string
    credentialStatus: CredentialStatus
}

export interface Issuer {
    id: string
    name: string
}

export interface CredentialSubject {
    id: string
    familyName: string
    firstName: string
    dateOfBirth: string
    personalIdentifier: string
    nameAndFamilyNameAtBirth: string
    placeOfBirth: string
    currentAddress: string
    gender: string
}

export interface CredentialSchema {
    id: string
    type: string
}

export interface MeecoApprovedSubmission {
    vpRequest: VpRequest
    cid: string
    role: string
}

export interface VpRequest {
    submission: Submission
}

export interface Submission {
    id: string
    presentation_request_id: string
    vp_token: string
    id_token: string
    state: any
    status: string
    created_at: string
    updated_at: string
    verification_result: any
    last_verified_at: any
}

export interface VerifiableCredentialStatusListResult {
    iat: number
    vc: VcStatusList
    nbf: number
    iss: string
    sub: string
}

export interface VcStatusList {
    'context': string[]
    id: string
    type: string[]
    issuer: string
    issuanceDate: string
    credentialSubject: CredentialSubjectStatusList
}

export interface CredentialSubjectStatusList {
    id: string
    type: string
    statusPurpose: string
    encodedList: string
}
