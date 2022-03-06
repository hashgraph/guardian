import FastMQ from 'fastmq';
import { NFTStorage } from 'nft.storage';
import { fileAPI } from './api/file.service';

const PORT = process.env.PORT || 3006;

Promise.all([
    FastMQ.Client.connect(process.env.SERVICE_CHANNEL, 7500, process.env.MQ_ADDRESS),
]).then(async values => {
    const [channel] = values;
    await fileAPI(channel, new NFTStorage({ token: process.env.NFT_API_KEY }));

    console.log('ipfs-client service started');
})
