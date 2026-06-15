// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.28 <0.9.0;

import "./IGuardianOracle.sol";
import "../version/Version.sol";

/**
 * @title GuardianOracle
 * @notice On-chain registry of Guardian trust-chain validity verdicts.
 *
 * Guardian instances act as off-chain oracles: whenever a token's trust chain
 * is created or changes state (new VP minted, policy revoked, etc.) the
 * Guardian oracle-service backend calls `updateVerdict` / `updateVerdicts`
 * to store the binary valid/invalid result on-chain.
 *
 * Any Hedera smart contract can then call `isTokenValid`, `areTokensValid`,
 * or `allTokensValid` to gate operations on the validity of environmental
 * assets — without any off-chain round-trips.
 *
 * ## Access control
 * - **Owner**: deploying address; can add/remove operators.
 * - **Operators**: Guardian backend addresses authorised to push verdicts.
 *
 * ## Hedera notes
 * - Deployed via JSON-RPC relay; address is the EVM mirror of the Hedera
 *   contract id. Token EVM addresses map 1:1 to HTS token ids via the
 *   precompile alias (0x00…01 + tokenId).
 * - `view` calls are answered by Hedera Mirror Nodes at no gas cost to the
 *   caller, making trust-chain checks cheap for other contracts.
 */
contract GuardianOracle is IGuardianOracle, Version {
    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    struct Verdict {
        bool     isValid;
        uint256  updatedAt;
        address  updatedBy;
    }

    /// @dev tokenAddress => Verdict
    mapping(address => Verdict) private _verdicts;

    address private _owner;
    mapping(address => bool) private _operators;

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error NotOwner();
    error NotOperator();
    error ZeroAddress();
    error ArrayLengthMismatch();

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier onlyOwner() {
        if (msg.sender != _owner) revert NotOwner();
        _;
    }

    modifier onlyOperator() {
        if (!_operators[msg.sender] && msg.sender != _owner) revert NotOperator();
        _;
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor() {
        _owner = msg.sender;
        _operators[msg.sender] = true;
        emit OperatorAdded(msg.sender);
    }

    // -------------------------------------------------------------------------
    // Version (matches other Guardian contracts)
    // -------------------------------------------------------------------------

    function ver() public pure override returns (uint256[3] memory) {
        return [uint256(1), 0, 0];
    }

    // -------------------------------------------------------------------------
    // Read functions
    // -------------------------------------------------------------------------

    /**
     * @inheritdoc IGuardianOracle
     */
    function isTokenValid(address tokenAddress)
        external
        view
        override
        returns (bool valid, uint256 updatedAt)
    {
        Verdict storage v = _verdicts[tokenAddress];
        return (v.isValid, v.updatedAt);
    }

    /**
     * @inheritdoc IGuardianOracle
     */
    function areTokensValid(address[] calldata tokenAddresses)
        external
        view
        override
        returns (bool[] memory results, uint256[] memory timestamps)
    {
        uint256 len = tokenAddresses.length;
        results    = new bool[](len);
        timestamps = new uint256[](len);
        for (uint256 i = 0; i < len; ++i) {
            Verdict storage v = _verdicts[tokenAddresses[i]];
            results[i]    = v.isValid;
            timestamps[i] = v.updatedAt;
        }
    }

    /**
     * @inheritdoc IGuardianOracle
     */
    function allTokensValid(address[] calldata tokenAddresses)
        external
        view
        override
        returns (bool allValid)
    {
        for (uint256 i = 0; i < tokenAddresses.length; ++i) {
            if (!_verdicts[tokenAddresses[i]].isValid) {
                return false;
            }
        }
        return true;
    }

    // -------------------------------------------------------------------------
    // Write functions (operator-only)
    // -------------------------------------------------------------------------

    /**
     * @inheritdoc IGuardianOracle
     */
    function updateVerdict(address tokenAddress, bool isValid)
        external
        override
        onlyOperator
    {
        if (tokenAddress == address(0)) revert ZeroAddress();
        _verdicts[tokenAddress] = Verdict({
            isValid:   isValid,
            updatedAt: block.timestamp,
            updatedBy: msg.sender
        });
        emit VerdictUpdated(tokenAddress, isValid, block.timestamp, msg.sender);
    }

    /**
     * @inheritdoc IGuardianOracle
     */
    function updateVerdicts(
        address[] calldata tokenAddresses,
        bool[] calldata    validities
    ) external override onlyOperator {
        if (tokenAddresses.length != validities.length) revert ArrayLengthMismatch();
        for (uint256 i = 0; i < tokenAddresses.length; ++i) {
            if (tokenAddresses[i] == address(0)) revert ZeroAddress();
            _verdicts[tokenAddresses[i]] = Verdict({
                isValid:   validities[i],
                updatedAt: block.timestamp,
                updatedBy: msg.sender
            });
            emit VerdictUpdated(tokenAddresses[i], validities[i], block.timestamp, msg.sender);
        }
    }

    // -------------------------------------------------------------------------
    // Admin functions (owner-only)
    // -------------------------------------------------------------------------

    /**
     * @inheritdoc IGuardianOracle
     */
    function addOperator(address operator) external override onlyOwner {
        if (operator == address(0)) revert ZeroAddress();
        _operators[operator] = true;
        emit OperatorAdded(operator);
    }

    /**
     * @inheritdoc IGuardianOracle
     */
    function removeOperator(address operator) external override onlyOwner {
        _operators[operator] = false;
        emit OperatorRemoved(operator);
    }

    /**
     * @inheritdoc IGuardianOracle
     */
    function isOperator(address account) external view override returns (bool) {
        return _operators[account] || account == _owner;
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * @notice Returns the verdict details for a token (for off-chain tooling).
     */
    function getVerdict(address tokenAddress)
        external
        view
        returns (bool isValid, uint256 updatedAt, address updatedBy)
    {
        Verdict storage v = _verdicts[tokenAddress];
        return (v.isValid, v.updatedAt, v.updatedBy);
    }

    /** @notice Returns the contract owner. */
    function owner() external view returns (address) {
        return _owner;
    }
}
