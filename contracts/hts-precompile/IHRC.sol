// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.7;

interface IHRC {
    function associate() external returns (uint256 responseCode);
    function dissociate() external returns (uint256 responseCode);
}
