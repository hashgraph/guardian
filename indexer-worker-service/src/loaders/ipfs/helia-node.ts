// import { nanoid } from 'nanoid'
// import { HeliaLibp2p, createHelia } from 'helia'
// import { unixfs } from '@helia/unixfs'
// import { CID } from 'multiformats/cid'
// import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
// import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
// import all from 'it-all'

// export class HeliaNode {
//     private node: any;
//     private index: number;
//     private readonly limit: number;
//     private readonly timeout: number;
//     private readonly id: string;

//     constructor() {
//         this.id = nanoid()
//         this.timeout = 60 * 1000;
//         this.limit = 10;
//         this.index = 0;
//         this.node = null;
//     }

//     public async start() {
//         this.node = await createHelia();
//     }

//     public async stop() {
//         if (this.node) {
//             await this.node.stop();
//             this.node = null;
//         }
//     }

//     public async get(cid: string): Promise<Buffer> {
//         if (!this.node) {
//             throw new Error('Node stopped.')
//         }
//         console.time(cid);
//         try {
//             this.index++;
//             const items = unixfs(this.node).cat(CID.parse(cid), {});
//             const buffer = uint8ArrayConcat(await all(items));
//             return Buffer.from(buffer);
//         } catch (error) {
//             this.index--;
//             console.timeEnd(cid);
//             throw error;
//         }
//     }
// }
