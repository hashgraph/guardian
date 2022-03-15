export interface IUIServiceDevice {
  id: string;
  owner: string;
  hash: string;
  document: IUIServiceDeviceDocument;
  createDate: string;
  updateDate: string;
  status: string;
  signature: number;
  type: string;
  policyId: string;
  tag: string;
}

export interface IUIServiceDeviceDocument {
  '@context': string[];
  id: string;
  type: string[];
  credentialSubject: IUIServiceDeviceCredentialSubject[];
  issuer: string;
  issuanceDate: string;
  proof: any;
}

export interface IUIServiceDeviceCredentialSubject {
  '@context': string[];
  id: string;
  type: string;
  projectId: string;
  projectName: string;
  sensorType: string;
  capacity: string;
}
