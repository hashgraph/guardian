import { AccountId, PrivateKey, TopicId } from '@hashgraph/sdk';
import dotenv from 'dotenv';

dotenv.config();

if(!process.env.OPERATOR_ID || process.env.OPERATOR_ID.length<5) {
    throw ('You need to fill OPERATOR_ID field in .env file');
}

if(!process.env.OPERATOR_KEY || process.env.OPERATOR_KEY.length<5) {
    throw ('You need to fill OPERATOR_KEY field in .env file');
}

try {
    const accountId = AccountId.fromString(process.env.OPERATOR_ID);
} catch (error) {
    throw ('OPERATOR_ID field in .env file: ' + error.message);
}

try {
    const accountKey = PrivateKey.fromString(process.env.OPERATOR_KEY);
} catch (error) {
    throw ('OPERATOR_KEY field in .env file: ' + error.message);
}

if(!process.env.SCHEMA_TOPIC_ID || process.env.SCHEMA_TOPIC_ID.length<5) {
    throw ('You need to fill SCHEMA_TOPIC_ID field in .env file');
}

try {
    TopicId.fromString(process.env.SCHEMA_TOPIC_ID);
} catch (error) {
    throw ('SCHEMA_TOPIC_ID field in .env file: ' + error.message);
}