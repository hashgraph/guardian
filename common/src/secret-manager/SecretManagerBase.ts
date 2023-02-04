export interface SecretManagerBase {
  getSecrets(path: string): Promise<any>
  setSecrets(path: string, data: any): Promise<any>
}