// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

import "../wipe/Wipe.sol";
import "../wipe/interfaces/Wipe_1_0_0.sol";
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

    function approveRetire(address usr, RetireTokenRequest[] calldata tokens)
        public
        virtual;

    function retireCheck(RetireTokenRequest[] calldata tokens)
        public
        virtual
        returns (bool);

    function wipeContract(address token) internal returns (Wipe, uint256[3] memory) {
        uint256[3] memory ver = [uint256(1),0,0];
        if (token == address(0)) {
            return (Wipe(address(0)), ver);
        }
        IHederaTokenService.KeyValue memory key = SafeViewHTS.safeGetTokenKey(
            token,
            8
        );
        Wipe tContract = key.contractId != address(0)
                ? Wipe(key.contractId)
                : Wipe(key.delegatableContractId);
        try tContract.ver() returns (uint256[3] memory result) {
            ver = result;
        } catch {}
        return (tContract, ver);
    }

    function canWipe(address[] memory tokens) public returns (bool) {
        for (uint256 i = 0; i < tokens.length; i++) {
            (Wipe tokenContract, uint256[3] memory ver) = wipeContract(tokens[i]);
            if (ver[0] == 1 && ver[1] == 0 && ver[2] == 0) {
                if (!Wipe_1_0_0(address(tokenContract)).isWiper()) {
                    return false;
                }
            } else {
                if (!tokenContract.isWiper(tokens[i])) {
                    return false;
                }
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

    function _getTokenIds(
        RetireTokenRequest[] calldata tokens
    ) internal pure returns (address[] memory) {
        address[] memory tIds = new address[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            tIds[i] = tokens[i].token;
        }
        return tIds;
    }
}
