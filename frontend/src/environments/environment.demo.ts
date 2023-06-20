export const environment = {
  production: false,
  displayDemoAccounts: true,
  explorerSettings: {
    url: 'https://explore.lworks.io/${network}/${type}/${value}',
    networkMap: {
        'mainnet': 'mainnet',
        'testnet': 'testnet',
        'local': 'testnet'
    },
    typeMap: {
        'tokens': 'tokens',
        'topics': 'topics',
        'accounts': 'accounts'
    }
  }
};
