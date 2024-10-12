export interface TokenInfo {
    token_id: string;
    name: string;
    symbol: string;
    type: string;
    memo: string;
    treasury_account_id: string;
    total_supply: string;
    admin_key: any;
    freeze_key: any;
    kyc_key: any;
    wipe_key: any;
    supply_key: any;
    pause_key: any;
    fee_schedule_key: any;
    auto_renew_account: string;
    auto_renew_period: number;
    created_timestamp: string;
    decimals: string;
    deleted: boolean;
    expiry_timestamp: any;
    freeze_default: boolean;
    initial_supply: string;
    max_supply: string;
    modified_timestamp: string;
    pause_status: string;
    supply_type: string;
    _status?: {
        messages: {
            message: string;
        }[];
    };
}