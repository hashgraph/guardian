import axios from 'axios';
import assert from 'assert';

import { GetURL, GetToken } from '../helpers';

function Ipfs() {
    it('/ipfs/file', async function() {
        this.timeout(60000);
        let result;
        result = await axios.post(
            GetURL('ipfs', 'file'),
            new Buffer(1024),
            {
                headers: {
                    'Content-Type': 'binary/octet-stream',
                    'Authorization': `Bearer ${GetToken('StandardRegistry')}`,
                }
            }
        );
        assert.equal(typeof result.data === 'string');
    })
}

export {
    Ipfs,
};
