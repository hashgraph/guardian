// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.28 <0.9.0;

abstract contract Access {
    event OwnerAdded(address);

    bytes32 constant OWNER = keccak256("OWNER");

    mapping(bytes32 => mapping(address => bool)) roles;

    error NoPermissions();

    modifier role(bytes32 r) {
        _role(r);
        _;
    }

    function _role(bytes32 r) internal view {
        if (!roles[r][msg.sender]) {
            revert NoPermissions();
        }
    }

    constructor() {
        _setRole(msg.sender, OWNER);
        emit OwnerAdded(msg.sender);

        _setRole(address(this), OWNER);
        emit OwnerAdded(address(this));
    }

    function _setRole(address usr, bytes32 r) internal {
        roles[r][usr] = true;
    }

    function _unsetRole(address usr, bytes32 r) internal {
        if (usr == address(this)) {
            revert NoPermissions();
        }
        roles[r][usr] = false;
    }

    function _hasRole(address usr, bytes32 r) internal view returns (bool) {
        return roles[r][usr];
    }
}
