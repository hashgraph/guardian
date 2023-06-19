import { Cryppo } from "./cryppo";
import { IMeecoConfig, MeecoApi } from "./meeco-api";

/**
 * MeecoProvider is a wrapper around the Meeco API and Cryppo.
 * It provides a single interface for the auth-service to interact with Meeco.
 */
export class MeecoProvider {
  private meecoApi: MeecoApi;
  private cryppo: Cryppo;

  constructor(config: IMeecoConfig, passphraseBase32: string) {
    this.meecoApi = new MeecoApi(config);
    this.cryppo = new Cryppo(passphraseBase32);
  }
}