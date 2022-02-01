import { MessageAPI } from 'interfaces';
import { NFTStorage } from 'nft.storage';
import Blob from 'cross-blob';


/**
 * Connecting to the message broker methods of working with IPFS.
 * 
 * @param channel - channel
 * @param node - IPFS client
 */
export const fileAPI = async function (
    channel: any,
    client: NFTStorage
): Promise<void> {
    /**
     * Add file and return hash
     * 
     * @param {ArrayBuffer} [payload] - file to add
     * 
     * @returns {string} - hash of added file
     */
    channel.response(MessageAPI.IPFS_ADD_FILE, async (msg, res) => {
        try {
            let blob = new Blob([msg.payload]);
            const cid = await client.storeBlob(blob);
            res.send(cid, 'json');
        }
        catch(e) {
            console.log(e);
            res.send(null,'json');
        }
    })
}
