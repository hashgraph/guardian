// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

import "../../access/Access.sol";

abstract contract RetireRequestStorage is Access {
    struct RetireTokenRequest {
        address token;
        int64 count;
        int64[] serials;
    }

    function getRequest(address usr, address[] calldata tokens)
        public
        view
        virtual
        returns (RetireTokenRequest[] memory);

    function setRequest(address usr, RetireTokenRequest[] calldata tokens)
        public
        virtual;

    function unsetRequest(address usr, address[] memory tokens)
        public
        virtual;

    function getRequests(uint8 tc) external view virtual returns (bytes memory);
}
