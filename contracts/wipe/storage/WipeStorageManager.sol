// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

import "./WipeStorage.sol";

contract WipeStorageManager {
    function initStorage() public returns (WipeStorage) {
        return new WipeStorage();
    }
}
