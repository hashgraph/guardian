// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

import "../RetireImplementation.sol";
import "./RetireSingleTokenStorageManager.sol";

contract RetireSingleToken is RetireImplementation(new RetireSingleTokenStorageManager()) {
    modifier tokenCount(uint8 tc) override {
        require(tc == 1);
        _;
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
        (RetireTokenPool[] memory opt, ) = getPool(tokenAddresses);

        // If tokens more than 2 can be transformed into the cycle
        require(opt[0].count > 0);

        int64 retireCount = _getTokenCount(tokens[0]);

        return retireCount >= opt[0].count && retireCount % opt[0].count == 0;
    }
}