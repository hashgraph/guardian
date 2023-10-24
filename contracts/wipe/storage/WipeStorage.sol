// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

import "../../access/Access.sol";

contract WipeStorage is Access {
    address[] requestStorage;
    mapping(address => uint256) requestPos;

    function requests() external view returns (address[] memory) {
        return requestStorage;
    }

    function unsetRequest(address account) public role(OWNER) {
        require(requestPos[account] > 0, "NO_REQUEST");
        address request = requestStorage[requestPos[account] - 1];
        address last = requestStorage[requestStorage.length - 1];
        requestPos[last] = requestPos[request];
        requestStorage[requestPos[account] - 1] = requestStorage[
            requestStorage.length - 1
        ];
        delete requestPos[request];
        requestStorage.pop();
    }

    function setRequest(address account) public role(OWNER) {
        require(account != address(0) && requestPos[account] == 0);
        requestStorage.push(account);
        requestPos[account] = requestStorage.length;
    }
}
