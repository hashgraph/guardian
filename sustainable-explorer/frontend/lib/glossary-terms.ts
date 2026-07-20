
export type GlossaryCategory = 'carbon' | 'chain' | 'sdg' | 'platform';

export interface GlossaryTermMeta {
    id: string;
    category: GlossaryCategory;
    relatedIds: string[];
}

export const GLOSSARY_CATEGORIES: GlossaryCategory[] = ['carbon', 'chain', 'sdg', 'platform'];

export const GLOSSARY_TERMS: GlossaryTermMeta[] = [
    // Carbon Markets
    { id: 'issuance', category: 'carbon', relatedIds: ['vintage', 'retirement', 'registry'] },
    { id: 'retirement', category: 'carbon', relatedIds: ['issuance'] },
    { id: 'vintage', category: 'carbon', relatedIds: ['crediting-period', 'issuance'] },
    { id: 'registry', category: 'carbon', relatedIds: ['methodology'] },
    { id: 'methodology', category: 'carbon', relatedIds: ['registry', 'policy'] },
    { id: 'sectoral-scope', category: 'carbon', relatedIds: [] },
    { id: 'crediting-period', category: 'carbon', relatedIds: ['vintage'] },
    { id: 'tco2e', category: 'carbon', relatedIds: ['issuance'] },
    { id: 'active-supply', category: 'carbon', relatedIds: ['issuance', 'retirement'] },
    { id: 'mint-amount', category: 'carbon', relatedIds: ['issuance', 'token-supply'] },
    { id: 'total-credits', category: 'carbon', relatedIds: ['issuance'] },
    { id: 'transfer', category: 'carbon', relatedIds: ['retirement', 'active-supply'] },
    { id: 'standard', category: 'carbon', relatedIds: ['registry', 'methodology'] },
    { id: 'category', category: 'carbon', relatedIds: ['sectoral-scope'] },
    { id: 'developer', category: 'carbon', relatedIds: ['registry'] },
    { id: 'credit-lifecycle', category: 'carbon', relatedIds: ['issuance', 'retirement'] },

    // Blockchain & Hedera
    { id: 'guardian', category: 'chain', relatedIds: ['policy', 'vc'] },
    { id: 'policy', category: 'chain', relatedIds: ['methodology', 'guardian'] },
    { id: 'onchain', category: 'chain', relatedIds: ['topic-id', 'mainnet'] },
    { id: 'topic-id', category: 'chain', relatedIds: ['onchain'] },
    { id: 'mainnet', category: 'chain', relatedIds: ['onchain', 'testnet'] },
    { id: 'testnet', category: 'chain', relatedIds: ['mainnet'] },
    { id: 'did', category: 'chain', relatedIds: ['vc'] },
    { id: 'vc', category: 'chain', relatedIds: ['guardian', 'did'] },
    { id: 'nft', category: 'chain', relatedIds: ['fungible'] },
    { id: 'fungible', category: 'chain', relatedIds: ['nft'] },
    { id: 'token-supply', category: 'chain', relatedIds: ['mint-amount'] },
    { id: 'total-minted', category: 'chain', relatedIds: ['mint-amount', 'token-supply'] },
    { id: 'instance-topic-id', category: 'chain', relatedIds: ['topic-id'] },
    { id: 'policy-topic-id', category: 'chain', relatedIds: ['topic-id', 'policy'] },
    { id: 'root-vc', category: 'chain', relatedIds: ['vc'] },
    { id: 'hashscan', category: 'chain', relatedIds: ['onchain'] },
    { id: 'ipfs', category: 'chain', relatedIds: ['vc'] },
    { id: 'schema', category: 'chain', relatedIds: ['policy', 'methodology'] },

    // SDGs
    { id: 'sdg', category: 'sdg', relatedIds: ['sectoral-scope'] },

    // Platform & Data
    { id: 'watchlist', category: 'platform', relatedIds: [] },
    { id: 'custom-chart', category: 'platform', relatedIds: ['widget-library'] },
    { id: 'widget-library', category: 'platform', relatedIds: ['custom-chart'] },
    { id: 'raw-data', category: 'platform', relatedIds: ['vc'] },
    { id: 'mock-data', category: 'platform', relatedIds: [] },
    { id: 'guest-view', category: 'platform', relatedIds: ['watchlist'] },
    { id: 'sync-status', category: 'platform', relatedIds: ['mainnet'] },
    { id: 'quick-filter', category: 'platform', relatedIds: [] },
    { id: 'system-user', category: 'platform', relatedIds: ['watchlist', 'guest-view', 'system-administrator'] },
    { id: 'system-administrator', category: 'platform', relatedIds: ['system-user', 'sync-status'] },
];

export const GLOSSARY_TERM_MAP: Record<string, GlossaryTermMeta> = Object.fromEntries(
    GLOSSARY_TERMS.map(t => [t.id, t]),
);
