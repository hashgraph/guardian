// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.28 <0.9.0;

abstract contract Access {
    event OwnerAdded(address indexed account);
    event OwnerRemoved(address indexed account);
    event OwnerProposed(address indexed pendingOwner);

    bytes32 constant OWNER = keccak256("OWNER");

    mapping(bytes32 => mapping(address => bool)) roles;
    address public pendingOwner;

    modifier role(bytes32 r) {
        require(roles[r][msg.sender], "Access: caller lacks required role");
        _;
    }

    constructor() {
        _setRole(msg.sender, OWNER);
        emit OwnerAdded(msg.sender);

        _setRole(address(this), OWNER);
        emit OwnerAdded(address(this));
    }

    function proposeOwner(address newOwner) external role(OWNER) {
        pendingOwner = newOwner;
        emit OwnerProposed(newOwner);
    }

    function claimOwner() external {
        require(msg.sender == pendingOwner, "Access: caller is not the pending owner");
        _setRole(msg.sender, OWNER);
        emit OwnerAdded(msg.sender);
        pendingOwner = address(0);
    }

    function removeOwner(address account) external role(OWNER) {
        require(account != msg.sender && account != address(this), "Access: cannot remove self or contract");
        _unsetRole(account, OWNER);
        emit OwnerRemoved(account);
    }

    function _setRole(address usr, bytes32 r) internal {
        roles[r][usr] = true;
    }

    function _unsetRole(address usr, bytes32 r) internal {
        require(usr != address(this), "Access: cannot unset role for contract");
        roles[r][usr] = false;
    }

    function _hasRole(address usr, bytes32 r) internal view returns (bool) {
        return roles[r][usr];
    }
}
