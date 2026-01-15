export const environment = {
    production: true,
    displayDemoAccounts: false,
    accessTokenUpdateInterval: 29 * 1000,
    isMeecoConfigured: false,
    isAuthorizePopup: true,
    explorerSettings: {
        url: 'https://hashscan.io/${network}/${type}/${value}/${subType}/${subValue}',
        networkMap: {
            'mainnet': 'mainnet',
            'testnet': 'testnet',
            'local': 'testnet'
        },
        typeMap: {
            'tokens': 'token',
            'topics': 'topic',
            'accounts': 'account',
            'messages': 'transaction',
            'serials': '',
            'contracts': 'contract',
        }
    }
};
