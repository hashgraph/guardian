// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
    accessTokenUpdateInterval: 29 * 1000,
    displayDemoAccounts: true,
    isMeecoConfigured: true,
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

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
