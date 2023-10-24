export const environment = {
  production: true,
  displayDemoAccounts: true,
    accessTokenUpdateInterval: 29 * 1000,
  isMeecoConfigured: false,
  explorerSettings: {
    url: 'https://explore.lworks.io/${network}/${type}/${value}/${subType}/${subValue}',
    networkMap: {
        'mainnet': 'mainnet',
        'testnet': 'testnet',
        'local': 'testnet'
    },
    typeMap: {
        'tokens': 'tokens',
        'topics': 'topics',
        'accounts': 'accounts',
        'messages': 'messages',
        'serials': 'nfts',
        'contracts': 'contracts',
    }
  }
};
