import { ChunkInfo } from "./chunk-info.js";

export interface TopicMessage {
    chunk_info: ChunkInfo;
    consensus_timestamp: string;
    message: string;
    payer_account_id: string;
    running_hash: string;
    running_hash_version: number;
    sequence_number: number;
    topic_id: string;
}
