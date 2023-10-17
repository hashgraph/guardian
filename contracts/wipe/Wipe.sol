// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

import "../access/Access.sol";
import "../safe-hts-precompile/SafeHTS.sol";
import "./storage/WipeStorageManager.sol";
import "./storage/WipeStorage.sol";

contract Wipe is SafeHTS, Access {
    event AdminAdded(address account);
    event AdminRemoved(address account);
    event ManagerAdded(address account);
    event ManagerRemoved(address account);
    event WiperAdded(address account);
    event WiperRemoved(address account);
    event WipeRequestAdded(address account);
    event WipeRequestRemoved(address account);
    event WipeRequestsCleared();

    bytes32 constant WIPER = keccak256("WIPER");
    bytes32 constant MANAGER = keccak256("MANAGER");
    bytes32 constant ADMIN = keccak256("ADMIN");

    WipeStorageManager storageManager;
    WipeStorage wipeStorage;
    mapping(address => bool) requestBan;
    bool public requestsDisabled;

    constructor() {
        _setRole(address(this), WIPER);
        _setRole(address(this), ADMIN);
        _setRole(address(this), MANAGER);
        emit AdminAdded(address(this));
        emit ManagerAdded(address(this));
        emit WiperAdded(address(this));

        _setRole(msg.sender, WIPER);
        _setRole(msg.sender, ADMIN);
        _setRole(msg.sender, MANAGER);
        emit AdminAdded(msg.sender);
        emit ManagerAdded(msg.sender);
        emit WiperAdded(msg.sender);

        storageManager = new WipeStorageManager();
        clear();
    }

    function requests() external view role(MANAGER) returns (address[] memory) {
        return wipeStorage.requests();
    }

    function banned() public view returns (bool) {
        return requestBan[msg.sender];
    }

    function enableRequests() external role(ADMIN) {
        requestsDisabled = false;
    }

    function disableRequests() external role(ADMIN) {
        requestsDisabled = true;
    }

    function clear() public role(OWNER) {
        (bool success, bytes memory result) = address(storageManager).delegatecall(
            abi.encodeWithSelector(storageManager.initStorage.selector)
        );
        require(success);
        wipeStorage = abi.decode(result, (WipeStorage));
        emit WipeRequestsCleared();
    }

    function setRequestBan(address account, bool flag) public role(MANAGER) {
        requestBan[account] = flag;
    }

    function reject(address account, bool ban) public role(MANAGER) {
        wipeStorage.unsetRequest(account);
        emit WipeRequestRemoved(account);
        setRequestBan(account, ban);
    }

    function approve(address account) external role(MANAGER) {
        addWiper(account);
        reject(account, false);
    }

    function requestWiper() public {
        require(!requestBan[msg.sender], "BANNED");
        require(!requestsDisabled, "REQUESTS_DISABLED");
        require(!_hasRole(msg.sender, WIPER), "ALREADY_HAS_WIPER");
        wipeStorage.setRequest(msg.sender);
        emit WipeRequestAdded(msg.sender);
    }

    function addWiper(address account) public role(MANAGER) {
        _setRole(account, WIPER);
        emit WiperAdded(account);
    }

    function removeWiper(address account) public role(MANAGER) {
        _unsetRole(account, WIPER);
        emit WiperRemoved(account);
    }

    function addManager(address account) public role(ADMIN) {
        _setRole(account, MANAGER);
        emit ManagerAdded(account);
    }

    function removeManager(address account) public role(ADMIN) {
        _unsetRole(account, MANAGER);
        emit ManagerRemoved(account);
    }

    function addAdmin(address account) public role(OWNER) {
        _setRole(account, ADMIN);
        emit AdminAdded(account);
    }

    function removeAdmin(address account) public role(OWNER) {
        _unsetRole(account, ADMIN);
        emit AdminRemoved(account);
    }

    function isAdmin() public view returns (bool) {
        return _hasRole(msg.sender, ADMIN);
    }

    function isManager() public view returns (bool) {
        return _hasRole(msg.sender, MANAGER);
    }

    function isWiper() public view returns (bool) {
        return _hasRole(msg.sender, WIPER);
    }

    function permissions() external view returns (uint8) {
        uint8 result = 0;
        if (_hasRole(msg.sender, OWNER)) {
            result |= 1;
        }
        if (isAdmin()) {
            result |= 1 << 1;
        }
        if (isManager()) {
            result |= 1 << 2;
        }
        if (isWiper()) {
            result |= 1 << 3;
        }
        return result;
    }

    function wipe(
        address token,
        address account,
        int64 amount
    ) public role(WIPER) {
        safeWipeTokenAccount(token, account, amount);
    }

    function wipeNFT(
        address token,
        address account,
        int64[] memory serialNumbers
    ) public role(WIPER) {
        safeWipeTokenAccountNFT(token, account, serialNumbers);
    }
}
