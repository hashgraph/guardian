// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.28 <0.9.0;

import "../../access/Access.sol";

contract UserRequestStorage is Access {
    error NoRequest();
    error InvalidRequest();

    address[] requests;
    mapping(address => uint256) requestPos;

    function unsetRequest(address token) public role(OWNER) {
        if (requestPos[token] == 0) {
            revert NoRequest();
        }
        address request = requests[requestPos[token] - 1];
        address last = requests[requests.length - 1];
        requestPos[last] = requestPos[request];
        requests[requestPos[token] - 1] = requests[requests.length - 1];
        delete requestPos[request];
        requests.pop();
    }

    function setRequest(address token) public role(OWNER) {
        if (token == address(0) || requestPos[token] != 0) {
            revert InvalidRequest();
        }
        requests.push(token);
        requestPos[token] = requests.length;
    }
}
