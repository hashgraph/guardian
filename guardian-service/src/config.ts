import { TopicId } from '@hashgraph/sdk';
import dotenv from 'dotenv';

dotenv.config();

if(!process.env.SCHEMA_TOPIC_ID || process.env.SCHEMA_TOPIC_ID.length<5) {
    throw ('You need to fill SCHEMA_TOPIC_ID field in .env file');
}

try {
    TopicId.fromString(process.env.SCHEMA_TOPIC_ID);
} catch (error) {
    throw ('SCHEMA_TOPIC_ID field in .env file: ' + error.message);
}