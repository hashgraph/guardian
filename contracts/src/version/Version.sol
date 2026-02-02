// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.28 <0.9.0;

abstract contract Version {
    event VersionInfo(uint256[3] version);

    constructor() {
        emit VersionInfo(ver());
    }

    function ver() public pure virtual returns (uint256[3] memory) {
        return [uint256(1), 0, 0];
    }
}
