// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.28 <0.9.0;

import "../storage/RetireRequestStorage.sol";

contract RetireSingleTokenRequestStorage is RetireRequestStorage {
    error NoRequest();

    struct Request {
        address usr;
        address base;
        int64 baseCount;
        int64[] baseSerials;
    }

    Request[] requests;
    mapping(address => mapping(address => uint256)) requestPos;

    function getRequests(uint8) public view override returns (bytes memory) {
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

        Request storage request = requests[requestPos[account][base] - 1];
        RetireTokenRequest[] memory tokenOptions = new RetireTokenRequest[](1);
        tokenOptions[0] =
            RetireTokenRequest({ token: request.base, count: request.baseCount, serials: request.baseSerials });
        return tokenOptions;
    }

    function unsetRequest(address usr, address[] memory tokens) public override role(OWNER) {
        address account = usr;
        address base = tokens[0];
        if (requestPos[account][base] == 0) {
            revert NoRequest();
        }
        Request storage last = requests[requests.length - 1];
        requestPos[last.usr][last.base] = requestPos[account][base];
        requests[requestPos[account][base] - 1] = requests[requests.length - 1];
        delete requestPos[account][base];
        requests.pop();
    }

    function setRequest(address usr, RetireTokenRequest[] calldata tokens) public override role(OWNER) {
        address account = usr;
        address base = tokens[0].token;
        int64 baseCount = tokens[0].count;
        int64[] memory baseSerials = tokens[0].serials;
        if (requestPos[account][base] > 0) {
            address[] memory tokenAddresses = new address[](1);
            tokenAddresses[0] = base;
            unsetRequest(account, tokenAddresses);
        }
        requests.push(Request({ usr: account, base: base, baseCount: baseCount, baseSerials: baseSerials }));
        requestPos[account][base] = requests.length;
    }
}
