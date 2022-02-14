import dotenv from 'dotenv';

dotenv.config();

if(!process.env.NFT_API_KEY || process.env.NFT_API_KEY.length<20) {
    throw ('You need to fill NFT_API_KEY field in .env file');
}