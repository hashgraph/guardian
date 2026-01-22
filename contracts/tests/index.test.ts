import {closeClient} from './shared-setup';

import './deployment.test';
import './ban-system.test';
import './wiper-management.test';
import './fungible-wipe.test';
import './nft-wipe.test';
import './wipe-request-system.test';

import './retire-common.test';

import './retire-single-pool-management.test';
import './retire-single-operations.test';
import './retire-single-nft.test';
import './retire-single-request.test';

import './retire-double-pool-management.test';
import './retire-double-operations.test';

after(() => {
    closeClient();
});
