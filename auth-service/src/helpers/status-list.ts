/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import { Bitstring } from '@digitalbazaar/bitstring';

export class StatusList {
  bitstring: any;
  length: number;

  // @ts-ignore
  constructor({ length , buffer } = {}) {
    this.bitstring = new Bitstring({length, buffer});
    console.log('this.bitstring', this.bitstring)
    this.length = this.bitstring.length;
  }

  setStatus(index, status) {
    if(typeof status !== 'boolean') {
      throw new TypeError('"status" must be a boolean.');
    }
    return this.bitstring.set(index, status);
  }

  getStatus(index) {
    return this.bitstring.get(index);
  }

  async encode() {
    return this.bitstring.encodeBits();
  }

  static async decode({encodedList}) {
    try {
      const buffer = await Bitstring.decodeBits({encoded: encodedList});
      // @ts-ignore
      return new StatusList({ buffer });
    } catch(e) {
      if(e instanceof Error) {
        throw e;
      }
      throw new Error(
        `Could not decode encoded status list; reason: ${e}`);
    }
  }
}
