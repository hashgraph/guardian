import { bytesToBinaryString } from '@meeco/cryppo'
import * as baseX from 'base-x';

const base32Alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export class Cryppo {
  private passphrase: string;

  constructor(passphraseBase32: string) {
    this.passphrase = this.decodeBase32(passphraseBase32);
  }

  decodeBase32 = (val: string) => {
    const decoded = baseX(base32Alphabet).decode(val.trim().replace(/-/g, ''));
    return bytesToBinaryString(decoded);
  };
}