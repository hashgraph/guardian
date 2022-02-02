import { TopicId } from '@hashgraph/sdk';
import dotenv from 'dotenv';

dotenv.config();

if(!process.env.SUBMIT_SCHEMA_TOPIC_ID || process.env.SUBMIT_SCHEMA_TOPIC_ID.length<5) {
    throw ('You need to fill SUBMIT_SCHEMA_TOPIC_ID field in .env file');
}

try {
    const accountId = TopicId.fromString(process.env.SUBMIT_SCHEMA_TOPIC_ID);
} catch (error) {
    throw ('SUBMIT_SCHEMA_TOPIC_ID field in .env file: ' + error.message);
}