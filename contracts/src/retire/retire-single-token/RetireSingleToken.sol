// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.28 <0.9.0;

import "../RetireImplementation.sol";
import "./RetireSingleTokenStorageManager.sol";

contract RetireSingleToken is RetireImplementation(new RetireSingleTokenStorageManager()) {
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
        if (tc != 1) {
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
        address[] memory tokenAddresses = new address[](1);
        tokenAddresses[0] = tokens[0].token;
        (RetireTokenPool[] memory opt,) = getPool(tokenAddresses);

        // If tokens more than 2 can be transformed into the cycle
        if (opt[0].count <= 0) {
            revert PoolNotConfigured();
        }

        int64 retireCount = _getTokenCount(tokens[0]);

        return retireCount >= opt[0].count && retireCount % opt[0].count == 0;
    }
}
