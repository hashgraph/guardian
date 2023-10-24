// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

import "../storage/RetireRequestStorage.sol";

contract RetireSingleTokenRequestStorage is RetireRequestStorage {
    struct Request {
        address usr;
        address base;
        int64 baseCount;
        int64[] baseSerials;
    }

    Request[] requests;
    mapping(address => mapping(address => uint256)) requestPos;

    function getRequests(uint8)
        public
        view
        override
        returns (bytes memory)
    {
        return abi.encode(requests);
    }

    function getRequest(address usr, address[] calldata tokens)
        public
        view
        override
        returns (RetireTokenRequest[] memory)
    {
        address account = usr;
        address base = tokens[0];

        Request memory request = requests[requestPos[account][base] - 1];
        RetireTokenRequest[]
            memory tokenOptions = new RetireTokenRequest[](1);
        tokenOptions[0] = RetireTokenRequest(
            request.base,
            request.baseCount,
            request.baseSerials
        );
        return tokenOptions;
    }

    function unsetRequest(address usr, address[] memory tokens)
        public
        override
        role(OWNER)
    {
        address account = usr;
        address base = tokens[0];
        require(requestPos[account][base] > 0, "NO_REQUEST");
        Request storage req = requests[requestPos[account][base] - 1];
        Request storage last = requests[requests.length - 1];
        requestPos[account][last.base] = requestPos[account][req.base];
        delete requestPos[account][req.base];
        req = last;
        requests.pop();
    }

    function setRequest(address usr, RetireTokenRequest[] calldata tokens)
        public
        override
        role(OWNER)
    {
        address account = usr;
        address base = tokens[0].token;
        int64 baseCount = tokens[0].count;
        int64[] memory baseSerials = tokens[0].serials;
        if (requestPos[account][base] > 0) {
            address[] memory tokenAddresses = new address[](1);
            tokenAddresses[0] = base;
            unsetRequest(account, tokenAddresses);
        }
        requests.push(Request(account, base, baseCount, baseSerials));
        requestPos[account][base] = requests.length;
    }
}
