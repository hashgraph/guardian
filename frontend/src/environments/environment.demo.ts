export const environment = {
  production: true,
  displayDemoAccounts: true,
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
