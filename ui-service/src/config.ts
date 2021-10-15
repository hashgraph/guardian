import dotenv from 'dotenv';

dotenv.config();

if(!process.env.OPERATOR_ID || process.env.OPERATOR_ID.length<5) {
    throw ('You need to fill OPERATOR_ID field in .env file');
}

if(!process.env.OPERATOR_KEY || process.env.OPERATOR_KEY.length<5) {
    throw ('You need to fill OPERATOR_KEY field in .env file');
}