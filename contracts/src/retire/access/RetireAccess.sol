// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.28 <0.9.0;

import "../../access/Access.sol";

abstract contract RetireAccess is Access {
    event AdminAdded(address);
    event AdminRemoved(address);
    bytes32 constant ADMIN = keccak256("ADMIN");

    constructor() {
        _setRole(msg.sender, ADMIN);
        _setRole(address(this), ADMIN);
    }

    function addAdmin(address account) external role(OWNER) {
        _setRole(account, ADMIN);
        emit AdminAdded(account);
    }

    function removeAdmin(address account) external role(OWNER) {
        _unsetRole(account, ADMIN);
        emit AdminRemoved(account);
    }

    function isAdmin() public view returns (bool) {
        return _hasRole(msg.sender, ADMIN);
    }

    function permissions() public view returns (uint8) {
        uint8 result = 0;
        if (_hasRole(msg.sender, OWNER)) {
            result |= 1;
        }
        if (isAdmin()) {
            result |= 1 << 1;
        }
        return result;
    }
}
