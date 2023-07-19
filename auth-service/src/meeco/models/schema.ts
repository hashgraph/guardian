export interface IMeecoSchema {
  name: string,
  schema_json: IMeecoSchemaData,
  organization_ids: string[],
}

export interface IMeecoSchemaData {
  $schema: string,
  description: string,
  name: string,
  type: string,
  properties: any,
  required: string[],
  additionalProperties: boolean,
}

export interface VerifiableCredential {
  iat: number
  exp: number
  vc: Vc
  sub: string
  nbf: number
  iss: string
}

export interface Vc {
  "@context": string[]
  id: string
  type: string[]
  issuer: Issuer
  credentialSubject: CredentialSubject
  issuanceDate: string
  credentialSchema: CredentialSchema
  expirationDate: string
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
