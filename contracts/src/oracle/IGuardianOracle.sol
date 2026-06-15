// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.28 <0.9.0;

/**
 * @title IGuardianOracle
 * @notice Interface for the Guardian Oracle contract.
 * Allows any Hedera smart contract to verify the trust-chain validity
 * of one or more Guardian-managed tokens.
 */
interface IGuardianOracle {
    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    /**
     * @notice Emitted when a token's validity verdict is updated.
     * @param tokenAddress  EVM address of the HTS token.
     * @param isValid       New validity verdict (true = valid trust chain).
     * @param updatedAt     Block timestamp of the update.
     * @param updatedBy     Address that submitted the update.
     */
    event VerdictUpdated(
        address indexed tokenAddress,
        bool isValid,
        uint256 updatedAt,
        address indexed updatedBy
    );

    /**
     * @notice Emitted when a new oracle operator is added.
     */
    event OperatorAdded(address indexed operator);

    /**
     * @notice Emitted when an oracle operator is removed.
     */
    event OperatorRemoved(address indexed operator);

    // -------------------------------------------------------------------------
    // Read functions (callable from other contracts — zero gas on Hedera mirror)
    // -------------------------------------------------------------------------

    /**
     * @notice Returns the validity of a single token's trust chain.
     * @param tokenAddress  EVM address of the HTS token to check.
     * @return valid        true if Guardian has certified the trust chain as valid.
     * @return updatedAt    Timestamp of the last verdict update (0 if never set).
     */
    function isTokenValid(address tokenAddress)
        external
        view
        returns (bool valid, uint256 updatedAt);

    /**
     * @notice Batch validity check for multiple tokens.
     * @param tokenAddresses  Array of EVM addresses to check.
     * @return results        Parallel array of validity booleans.
     * @return timestamps     Parallel array of last-update timestamps.
     */
    function areTokensValid(address[] calldata tokenAddresses)
        external
        view
        returns (bool[] memory results, uint256[] memory timestamps);

    /**
     * @notice Returns true only if ALL supplied tokens have valid trust chains.
     * Convenience function for smart contracts that need a single yes/no gate.
     * @param tokenAddresses  Tokens to check.
     * @return allValid       true if every token is valid.
     */
    function allTokensValid(address[] calldata tokenAddresses)
        external
        view
        returns (bool allValid);

    // -------------------------------------------------------------------------
    // Write functions (operator-only)
    // -------------------------------------------------------------------------

    /**
     * @notice Update the validity verdict for a single token.
     * @param tokenAddress  EVM address of the HTS token.
     * @param isValid       New validity verdict.
     */
    function updateVerdict(address tokenAddress, bool isValid) external;

    /**
     * @notice Batch update verdicts.
     * @param tokenAddresses  Tokens to update.
     * @param validities      Parallel array of new verdicts.
     */
    function updateVerdicts(
        address[] calldata tokenAddresses,
        bool[] calldata validities
    ) external;

    // -------------------------------------------------------------------------
    // Admin functions (owner-only)
    // -------------------------------------------------------------------------

    /** @notice Authorise an address to submit verdicts. */
    function addOperator(address operator) external;

    /** @notice Revoke an operator's authorisation. */
    function removeOperator(address operator) external;

    /** @notice Returns true if the address is an authorised operator. */
    function isOperator(address account) external view returns (bool);
}
