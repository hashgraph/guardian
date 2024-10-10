// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

import "../storage/RetireStorageManager.sol";
import "../storage/RetirePoolStorage.sol";
import "./RetireDoubleTokenPoolStorage.sol";
import "./RetireDoubleTokenRequestStorage.sol";

contract RetireDoubleTokenStorageManager is RetireStorageManager {
    function initPoolStorage() public override returns (RetirePoolStorage) {
        return new RetireDoubleTokenPoolStorage();
    }

    function initRequestStorage()
        public
        override
        returns (RetireRequestStorage)
    {
        return new RetireDoubleTokenRequestStorage();
    }
}