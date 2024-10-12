// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

import "../wipe/Wipe.sol";
import "../hts-precompile/IHederaTokenService.sol";
import "./access/RetireAccess.sol";
import "./storage/RetirePoolStorage.sol";
import "./storage/RetireRequestStorage.sol";

abstract contract RetireCommon is
    RetirePoolStorage,
    RetireRequestStorage,
    RetireAccess
{
    event Retire(address, RetireTokenRequest[]);

    // delegateCall execution
    function retire(RetireTokenRequest[] calldata tokens) public virtual;

    function approveRetire(address usr, address[] calldata tokens)
        public
        virtual;

    function retireCheck(RetireTokenRequest[] calldata tokens)
        public
        virtual
        returns (bool);

    function wipeContract(address token) internal returns (Wipe) {
        if (token == address(0)) {
            return Wipe(address(0));
        }
        IHederaTokenService.KeyValue memory key = SafeViewHTS.safeGetTokenKey(
            token,
            8
        );
        return
            key.contractId != address(0)
                ? Wipe(key.contractId)
                : Wipe(key.delegatableContractId);
    }

    function canWipe(address[] memory tokens) public returns (bool) {
        for (uint256 i = 0; i < tokens.length; i++) {
            if (!wipeContract(tokens[i]).isWiper()) {
                return false;
            }
        }
        return true;
    }

    // delegateCall
    function cancelRetireRequest(address[] calldata tokens) public {
        RetireCommon(this).unsetRequest(msg.sender, tokens);
    }

    function clearPools(uint8 tc) public virtual;

    function clearRequests(uint8 tc) public virtual;
}
