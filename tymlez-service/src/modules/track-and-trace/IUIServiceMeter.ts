export interface IUIServiceMeter {
  id: string;
  owner: string;
  hash: string;
  document: IUIServiceMeterDocument;
  createDate: string;
  updateDate: string;
  status: string;
  signature: number;
  type: string;
  policyId: string;
  tag: string;
}

export interface IUIServiceMeterDocument {
  '@context': string[];
  id: string;
  type: string[];
  credentialSubject: IUIServiceMeterCredentialSubject[];
  issuer: string;
  issuanceDate: string;
  proof: any;
}

export interface IUIServiceMeterCredentialSubject {
  '@context': string[];
  id: string;
  type: string;
  projectId: string;
  projectName: string;
  sensorType: string;
  capacity: string;
}
