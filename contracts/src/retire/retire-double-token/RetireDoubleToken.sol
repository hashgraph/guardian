// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.28 <0.9.0;

import "../RetireImplementation.sol";
import "./RetireDoubleTokenStorageManager.sol";

contract RetireDoubleToken is RetireImplementation(new RetireDoubleTokenStorageManager()) {
    error InvalidTokenCount();
    error PoolNotConfigured();

    constructor() {
        _setRole(msg.sender, OWNER);
        _setRole(msg.sender, ADMIN);
    }

    modifier tokenCount(uint8 tc) override {
        _tokenCount(tc);
        _;
    }

    function _tokenCount(uint8 tc) internal pure {
        if (tc != 2) {
            revert InvalidTokenCount();
        }
    }

    function retireCheck(RetireTokenRequest[] calldata tokens)
        public
        override
        tokenCount(uint8(tokens.length))
        returns (bool)
    {
        // If tokens more than 2 can be transformed into the cycle
        address[] memory tokenAddresses = new address[](2);
        tokenAddresses[0] = tokens[0].token;
        tokenAddresses[1] = tokens[1].token;
        (RetireTokenPool[] memory opt,) = getPool(tokenAddresses);

        // If tokens more than 2 can be transformed into the cycle
        if (opt[0].count <= 0 || opt[1].count <= 0) {
            revert PoolNotConfigured();
        }

        int64 baseRetireCount = _getTokenCount(tokens[0]);
        int64 oppositeRetireCount = _getTokenCount(tokens[1]);

        return (baseRetireCount >= opt[0].count) && (oppositeRetireCount >= opt[1].count)
            && ((baseRetireCount * int256(opt[1].count)) == (oppositeRetireCount * int256(opt[0].count)));
    }
}
