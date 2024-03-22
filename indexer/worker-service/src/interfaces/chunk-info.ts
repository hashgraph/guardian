export interface ChunkInfo {
    initial_transaction_id: {
        account_id: string;
        nonce: number;
        scheduled: boolean;
        transaction_valid_start: string;
    };
    number: number;
    total: number;
}
