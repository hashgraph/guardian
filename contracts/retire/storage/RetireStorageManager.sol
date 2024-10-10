// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

import "../storage/RetirePoolStorage.sol";
import "../storage/RetireRequestStorage.sol";

abstract contract RetireStorageManager {
    function initPoolStorage()
        public
        virtual
        returns (RetirePoolStorage)
    {}

    function initRequestStorage()
        public
        virtual
        returns (RetireRequestStorage);
}