// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

import "../../access/Access.sol";
import "../../safe-hts-precompile/SafeViewHTS.sol";

abstract contract RetirePoolStorage is Access, SafeViewHTS {
    struct RetireTokenPool {
        address token;
        int64 count;
    }

    function getPool(address[] memory tokens)
        public
        view
        virtual
        returns (RetireTokenPool[] memory, bool);

    function setPool(RetireTokenPool[] memory tokens, bool)
        public
        virtual
        role(OWNER)
    {
        for(uint256 i = 0; i < tokens.length; i++) {
            int32 tokenType = safeGetTokenType(tokens[i].token);
            if (tokenType == 1) {
                require(tokens[i].count <= 10, 'NFTS_LIMIT');
            } else if (tokenType != 0){
                revert('UNSUPPORTED_TOKEN_TYPE');
            }
        }
    }

    function unsetPool(address[] memory tokens) public virtual;

    function getPools(uint8) public view virtual returns (bytes memory);
}
