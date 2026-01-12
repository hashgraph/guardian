// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.28 <0.9.0;

import "../storage/RetirePoolStorage.sol";

contract RetireDoubleTokenPoolStorage is RetirePoolStorage {
    error NoPool();

    struct Pool {
        address base;
        address opposite;
        int64 baseCount;
        int64 oppositeCount;
        bool immediately;
    }

    Pool[] pools;
    mapping(address => mapping(address => uint256)) poolPos;

    function getPools(uint8) public view override returns (bytes memory) {
        return abi.encode(pools);
    }

    function unsetPool(address[] memory tokens) public override role(OWNER) {
        address base = tokens[0];
        address opposite = tokens[1];
        if (poolPos[base][opposite] == 0) {
            revert NoPool();
        }
        Pool storage last = pools[pools.length - 1];
        poolPos[last.base][last.opposite] = poolPos[base][opposite];
        poolPos[last.opposite][last.base] = poolPos[opposite][base];
        pools[poolPos[base][opposite] - 1] = pools[pools.length - 1];
        delete poolPos[base][opposite];
        delete poolPos[opposite][base];
        pools.pop();
    }

    function setPool(RetireTokenPool[] memory tokens, bool immediately) public override role(OWNER) {
        super.setPool(tokens, immediately);
        address base = tokens[0].token;
        address opposite = tokens[1].token;
        int64 baseCount = tokens[0].count;
        int64 oppositeCount = tokens[1].count;
        if (poolPos[base][opposite] > 0) {
            address[] memory tokenAddresses = new address[](2);
            tokenAddresses[0] = base;
            tokenAddresses[1] = opposite;
            unsetPool(tokenAddresses);
        }
        pools.push(
            Pool({
                base: base,
                opposite: opposite,
                baseCount: base != address(0) ? baseCount : int64(0),
                oppositeCount: opposite != address(0) ? oppositeCount : int64(0),
                immediately: immediately
            })
        );
        poolPos[base][opposite] = pools.length;
        poolPos[opposite][base] = pools.length;
    }

    function getPool(address[] memory tokens) public view override returns (RetireTokenPool[] memory, bool) {
        address base = tokens[0];
        address opposite = tokens[1];
        Pool storage pool = pools[poolPos[base][opposite] - 1];
        RetireTokenPool[] memory tokenOptions = new RetireTokenPool[](2);
        bool inverted = base == pool.opposite;
        tokenOptions[0] = inverted
            ? RetireTokenPool({token: pool.opposite, count: pool.oppositeCount})
            : RetireTokenPool({token: pool.base, count: pool.baseCount});
        tokenOptions[1] = inverted
            ? RetireTokenPool({token: pool.base, count: pool.baseCount})
            : RetireTokenPool({token: pool.opposite, count: pool.oppositeCount});
        return (tokenOptions, pool.immediately);
    }
}
