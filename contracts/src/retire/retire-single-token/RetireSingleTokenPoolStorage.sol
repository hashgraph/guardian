// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.28 <0.9.0;

import "../storage/RetirePoolStorage.sol";

contract RetireSingleTokenPoolStorage is RetirePoolStorage {
    error NoPool();

    struct Pool {
        address base;
        int64 baseCount;
        bool immediately;
    }

    Pool[] pools;
    mapping(address => uint256) poolPos;

    function getPools(uint8) public view override returns (bytes memory) {
        return abi.encode(pools);
    }

    function unsetPool(address[] memory tokens) public override role(OWNER) {
        address base = tokens[0];
        if (poolPos[base] == 0) {
            revert NoPool();
        }
        Pool storage last = pools[pools.length - 1];
        poolPos[last.base] = poolPos[base];
        pools[poolPos[base] - 1] = pools[pools.length - 1];
        delete poolPos[base];
        pools.pop();
    }

    function setPool(RetireTokenPool[] memory tokens, bool immediately) public override role(OWNER) {
        super.setPool(tokens, immediately);
        address base = tokens[0].token;
        int64 baseCount = tokens[0].count;
        if (poolPos[base] > 0) {
            address[] memory tokenAddresses = new address[](1);
            tokenAddresses[0] = base;
            unsetPool(tokenAddresses);
        }
        pools.push(Pool({base: base, baseCount: baseCount, immediately: immediately}));
        poolPos[base] = pools.length;
    }

    function getPool(address[] memory tokens) public view override returns (RetireTokenPool[] memory, bool) {
        address base = tokens[0];
        Pool storage pool = pools[poolPos[base] - 1];
        RetireTokenPool[] memory tokenOptions = new RetireTokenPool[](1);
        tokenOptions[0] = RetireTokenPool({token: pool.base, count: pool.baseCount});
        return (tokenOptions, pool.immediately);
    }
}
