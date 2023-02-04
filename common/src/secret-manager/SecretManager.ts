export interface SecretManager {
  getSecrets(path: string): Promise<any>
  setSecrets(path: string, data: any): Promise<any>
}