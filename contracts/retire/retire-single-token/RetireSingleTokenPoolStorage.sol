// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

import "../storage/RetirePoolStorage.sol";

contract RetireSingleTokenPoolStorage is RetirePoolStorage {
    struct Pool {
        address base;
        int64 baseCount;
        bool immediately;
    }

    Pool[] pools;
    mapping(address => uint256) poolPos;

    function getPools(uint8)
        public
        view
        override
        returns (bytes memory)
    {
        return abi.encode(pools);
    }

    function unsetPool(address[] memory tokens) public override role(OWNER) {
        address base = tokens[0];
        require(poolPos[base] > 0, "NO_POOL");
        Pool storage last = pools[pools.length - 1];
        poolPos[last.base] = poolPos[base];
        pools[poolPos[base] - 1] = pools[pools.length - 1];
        delete poolPos[base];
        pools.pop();
    }

    function setPool(RetireTokenPool[] memory tokens, bool immediately)
        public
        override
        role(OWNER)
    {
        address base = tokens[0].token;
        int64 baseCount = tokens[0].count;
        if (poolPos[base] > 0) {
            address[] memory tokenAddresses = new address[](1);
            tokenAddresses[0] = base;
            unsetPool(tokenAddresses);
        }
        pools.push(Pool(base, baseCount, immediately));
        poolPos[base] = pools.length;
    }

    function getPool(address[] memory tokens)
        public
        view
        override
        returns (RetireTokenPool[] memory, bool)
    {
        address base = tokens[0];
        Pool storage pool = pools[poolPos[base] - 1];
        RetireTokenPool[]
            memory tokenOptions = new RetireTokenPool[](1);
        tokenOptions[0] = RetireTokenPool(pool.base, pool.baseCount);
        return (tokenOptions, pool.immediately);
    }
}
