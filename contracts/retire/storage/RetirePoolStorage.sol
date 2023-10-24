// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

import "../../access/Access.sol";

abstract contract RetirePoolStorage is Access {
    struct RetireTokenPool {
        address token;
        int64 count;
    }

    function getPool(address[] memory tokens)
        public
        view
        virtual
        returns (RetireTokenPool[] memory, bool);

    function setPool(RetireTokenPool[] memory tokens, bool immediately)
        public
        virtual;

    function unsetPool(address[] memory tokens) public virtual;

    function getPools(uint8) public view virtual returns (bytes memory);
}