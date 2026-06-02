// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.28 <0.9.0;

abstract contract Wipe_1_0_0 {
    function isWiper() public view virtual returns (bool) {
        return false;
    }
    function requestWiper() public virtual { }
}
