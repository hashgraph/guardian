// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

import "../../access/Access.sol";

contract UserRequestStorage is Access {
    address[] requests;
    mapping(address => uint256) requestPos;

    function unsetRequest(address token) public role(OWNER) {
        require(requestPos[token] > 0, "NO_REQUEST");
        address request = requests[requestPos[token] - 1];
        address last = requests[requests.length - 1];
        requestPos[last] = requestPos[request];
        requests[requestPos[token] - 1] = requests[
            requests.length - 1
        ];
        delete requestPos[request];
        requests.pop();
    }

    function setRequest(address token) public role(OWNER) {
        require(token != address(0) && requestPos[token] == 0);
        requests.push(token);
        requestPos[token] = requests.length;
    }
}
