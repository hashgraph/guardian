// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.28 <0.9.0;

import "../access/Access.sol";
import "../safe-hts-precompile/SafeHTS.sol";
import "./storage/UserRequestStorage.sol";
import "../version/Version.sol";

contract Wipe is Version, SafeHTS, Access {
    event AdminAdded(address account);
    event AdminRemoved(address account);
    event ManagerAdded(address account);
    event ManagerRemoved(address account);
    event WiperAdded(address account, address token);
    event WiperRemoved(address account, address token);
    event WipeRequestAdded(address account, address token);
    event WipeRequestRemoved(address account, address token);
    event WipeRequestsCleared(address account);
    event RequestsDisabled();
    event RequestsEnabled();
    event Banned(address);
    event Unbanned(address);

    bytes32 constant MANAGER = keccak256("MANAGER");
    bytes32 constant ADMIN = keccak256("ADMIN");

    mapping(address => UserRequestStorage) userRequestStorage;
    mapping(address => mapping(address => bool)) tokenStorage;
    mapping(address => bool) bans;
    bool public requestsDisabled;

    error NotWiper();
    error BannedError();
    error AlreadyBanned();
    error NotBanned();
    error AlreadyWiper();
    error RequestsDisabledError();

    modifier isTokenWiper(address token) {
        _isTokenWiper(token);
        _;
    }

    function _isTokenWiper(address token) internal view {
        if (!isWiper(token)) {
            revert NotWiper();
        }
    }

    modifier isNotBanned() {
        _isNotBanned();
        _;
    }

    function _isNotBanned() internal view {
        if (banned()) {
            revert BannedError();
        }
    }

    constructor() {
        _setRole(address(this), ADMIN);
        _setRole(address(this), MANAGER);
        emit AdminAdded(address(this));
        emit ManagerAdded(address(this));

        _setRole(msg.sender, ADMIN);
        _setRole(msg.sender, MANAGER);
        emit AdminAdded(msg.sender);
        emit ManagerAdded(msg.sender);
    }

    function ver() public pure override returns (uint256[3] memory) {
        return [uint256(1), 0, 1];
    }

    function banned() public view returns (bool) {
        return bans[msg.sender];
    }

    function ban(address account) public role(MANAGER) {
        if (account == address(this)) {
            revert NoPermissions();
        }
        if (bans[account]) {
            revert AlreadyBanned();
        }
        bans[account] = true;
        emit Banned(account);
    }

    function unban(address account) public role(MANAGER) {
        if (!bans[account]) {
            revert NotBanned();
        }
        bans[account] = false;
        emit Unbanned(account);
    }

    function enableRequests() external role(ADMIN) {
        if (!requestsDisabled) {
            return;
        }
        requestsDisabled = false;
        emit RequestsEnabled();
    }

    function disableRequests() external role(ADMIN) {
        if (requestsDisabled) {
            return;
        }
        requestsDisabled = true;
        emit RequestsDisabled();
    }

    function clear(address account) public role(MANAGER) {
        userRequestStorage[account] = UserRequestStorage(address(0));
        emit WipeRequestsCleared(account);
    }

    function reject(address account, address token, bool b) public role(MANAGER) {
        if (b) {
            ban(account);
            clear(account);
        } else {
            userRequestStorage[account].unsetRequest(token);
            emit WipeRequestRemoved(account, token);
        }
    }

    function approve(address account, address token) external role(MANAGER) {
        addWiper(account, token);
        reject(account, token, false);
    }

    function requestWiper(address token) public isNotBanned {
        if (tokenStorage[msg.sender][token]) {
            revert AlreadyWiper();
        }
        if (requestsDisabled) {
            revert RequestsDisabledError();
        }
        if (address(userRequestStorage[msg.sender]) == address(0)) {
            userRequestStorage[msg.sender] = new UserRequestStorage();
        }
        userRequestStorage[msg.sender].setRequest(token);
        emit WipeRequestAdded(msg.sender, token);
    }

    function addWiper(address account, address token) public role(MANAGER) {
        if (tokenStorage[account][token]) {
            revert AlreadyWiper();
        }
        tokenStorage[account][token] = true;
        emit WiperAdded(account, token);
    }

    function removeWiper(address account, address token) public role(MANAGER) {
        if (!tokenStorage[account][token]) {
            revert NotWiper();
        }
        tokenStorage[account][token] = false;
        emit WiperRemoved(account, token);
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

    function isWiper(address token) public view returns (bool) {
        return tokenStorage[msg.sender][token];
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
        return result;
    }

    function wipe(address token, address account, int64 amount) public isTokenWiper(token) isNotBanned {
        safeWipeTokenAccount(token, account, amount);
    }

    /// forge-lint: disable-next-item(mixed-case-function)
    function wipeNFT(address token, address account, int64[] memory serialNumbers)
        public
        isTokenWiper(token)
        isNotBanned
    {
        safeWipeTokenAccountNFT(token, account, serialNumbers);
    }
}
