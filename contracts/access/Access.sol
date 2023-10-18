// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

abstract contract Access {
    event OwnerAdded(address);

    bytes32 constant OWNER = keccak256("OWNER");

    mapping(bytes32 => mapping(address => bool)) roles;

    modifier role(bytes32 r) {
        require(roles[r][msg.sender], "NO_PERMISSIONS");
        _;
    }

    constructor() {
        _setRole(msg.sender, OWNER);
        emit OwnerAdded(msg.sender);

        _setRole(address(this), OWNER);
        emit OwnerAdded(address(this));
    }

    function _setRole(
        address usr,
        bytes32 r
    ) internal {
        roles[r][usr] = true;
    }

    function _unsetRole(
        address usr,
        bytes32 r
    ) internal {
        require(usr != address(this));
        roles[r][usr] = false;
    }

    function _hasRole(address usr, bytes32 r) internal view returns (bool) {
        return roles[r][usr];
    }
}
