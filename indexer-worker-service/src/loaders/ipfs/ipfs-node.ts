// import * as IPFS from 'ipfs-core'
// import path from 'path';
// import os from 'os';
// import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
// import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
// import all from 'it-all'
// import { nanoid } from 'nanoid'

// export class IPFSNode {
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
//         const repoDir = path.join(os.tmpdir(), `repo-${this.id}`)
//         this.node = await IPFS.create({
//             repo: repoDir,
//             config: {
//                 Addresses: {
//                     Swarm: [
//                         `/ip4/0.0.0.0/tcp/0`,
//                         `/ip4/127.0.0.1/tcp/0/ws`
//                     ],
//                     API: `/ip4/127.0.0.1/tcp/0`,
//                     Gateway: `/ip4/127.0.0.1/tcp/0`,
//                     RPC: `/ip4/127.0.0.1/tcp/0`
//                 },
//                 Bootstrap: []
//             }
//         });
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
//         console.time(String(this.index));
//         try {
//             this.index++;
//             const items = this.node.cat(cid, { timeout: this.timeout });
//             const buffer = uint8ArrayConcat(await all(items));
//             return Buffer.from(buffer);
//         } catch (error) {
//             this.index--;
//             console.timeEnd(String(this.index));
//             throw error;
//         }
//     }
// }
