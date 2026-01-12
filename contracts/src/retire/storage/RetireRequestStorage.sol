// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.28 <0.9.0;

import "../../access/Access.sol";

abstract contract RetireRequestStorage is Access {
    struct RetireTokenRequest {
        address token;
        int64 count;
        int64[] serials;
    }

    function getRequest(address, address[] calldata) public view virtual returns (RetireTokenRequest[] memory) {
        return new RetireTokenRequest[](0);
    }

    function setRequest(address, RetireTokenRequest[] calldata) public virtual { }

    function unsetRequest(address, address[] memory) public virtual { }

    function getRequests(uint8) external view virtual returns (bytes memory) {
        return "";
    }
}
