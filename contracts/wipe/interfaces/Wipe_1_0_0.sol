// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

abstract contract Wipe_1_0_0 {
    function isWiper() public virtual view returns (bool);
    function requestWiper() public virtual;
}
