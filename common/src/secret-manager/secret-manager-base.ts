/**
 * Base interface for secret manager
 */
export interface SecretManagerBase {
  /**
   * Get secrets from secret manager
   * @param path secret path
   * @param addition
   */
  getSecrets(path: string, addition?: any): Promise<any>

  /**
   * Set secrets to secret manager
   * @param path secret path
   * @param data secret data
   * @returns void
   */
  setSecrets(path: string, data: any): Promise<void>
}
