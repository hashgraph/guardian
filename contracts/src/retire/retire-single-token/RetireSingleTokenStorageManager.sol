// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.28 <0.9.0;

import "../storage/RetireStorageManager.sol";
import "../storage/RetirePoolStorage.sol";
import "./RetireSingleTokenPoolStorage.sol";
import "./RetireSingleTokenRequestStorage.sol";

contract RetireSingleTokenStorageManager is RetireStorageManager {
    function initPoolStorage() public override returns (RetirePoolStorage) {
        return new RetireSingleTokenPoolStorage();
    }

    function initRequestStorage() public override returns (RetireRequestStorage) {
        return new RetireSingleTokenRequestStorage();
    }
}
