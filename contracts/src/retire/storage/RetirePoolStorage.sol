// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.28 <0.9.0;

import "../../access/Access.sol";
import "../../safe-hts-precompile/SafeViewHTS.sol";

abstract contract RetirePoolStorage is Access, SafeViewHTS {
    struct RetireTokenPool {
        address token;
        int64 count;
    }

    function getPool(address[] memory) public view virtual returns (RetireTokenPool[] memory, bool) {
        return (new RetireTokenPool[](0), false);
    }

    error NftsLimit();
    error UnsupportedTokenType();

    function setPool(RetireTokenPool[] memory tokens, bool) public virtual role(OWNER) {
        for (uint256 i = 0; i < tokens.length; i++) {
            int32 tokenType = safeGetTokenType(tokens[i].token);
            if (tokenType == 1) {
                if (tokens[i].count > 10) {
                    revert NftsLimit();
                }
            } else if (tokenType != 0) {
                revert UnsupportedTokenType();
            }
        }
    }

    function unsetPool(address[] memory tokens) public virtual { }

    function getPools(uint8) public view virtual returns (bytes memory) {
        return "";
    }
}
