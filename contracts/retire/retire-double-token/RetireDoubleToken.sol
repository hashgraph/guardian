// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

import "../RetireImplementation.sol";
import "./RetireDoubleTokenStorageManager.sol";

contract RetireDoubleToken is RetireImplementation(new RetireDoubleTokenStorageManager()) {
    modifier tokenCount(uint8 tc) override {
        require(tc == 2);
        _;
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
        (RetireTokenPool[] memory opt, ) = getPool(tokenAddresses);

        // If tokens more than 2 can be transformed into the cycle
        require(opt[0].count > 0 && opt[1].count > 0);

        int64 baseRetireCount = _getTokenCount(tokens[0]);
        int64 oppositeRetireCount = _getTokenCount(tokens[1]);

        return
            (baseRetireCount >= opt[0].count) &&
            (oppositeRetireCount >= opt[1].count) &&
            ((baseRetireCount * int256(opt[1].count)) ==
                (oppositeRetireCount * int256(opt[0].count)));
    }
}