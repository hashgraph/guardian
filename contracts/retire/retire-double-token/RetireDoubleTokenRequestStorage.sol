// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

import "../storage/RetireRequestStorage.sol";

contract RetireDoubleTokenRequestStorage is RetireRequestStorage {
    struct Request {
        address usr;
        address base;
        address opposite;
        int64 baseCount;
        int64 oppositeCount;
        int64[] baseSerials;
        int64[] oppositeSerials;
    }

    Request[] requests;
    mapping(address => mapping(address => mapping(address => uint256))) requestPos;

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
        address opposite = tokens[1];

        Request storage request = requests[
            requestPos[account][base][opposite] - 1
        ];
        bool inverted = base == request.opposite;
        RetireTokenRequest[] memory tokenOptions = new RetireTokenRequest[](2);
        tokenOptions[0] = inverted
            ? RetireTokenRequest(
                request.opposite,
                request.oppositeCount,
                request.oppositeSerials
            )
            : RetireTokenRequest(
                request.base,
                request.baseCount,
                request.baseSerials
            );
        tokenOptions[1] = inverted
            ? RetireTokenRequest(
                request.base,
                request.baseCount,
                request.baseSerials
            )
            : RetireTokenRequest(
                request.opposite,
                request.oppositeCount,
                request.oppositeSerials
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
        address opposite = tokens[1];
        require(requestPos[account][base][opposite] > 0, "NO_REQUEST");
        Request storage last = requests[requests.length - 1];
        requestPos[last.usr][last.base][last.opposite] = requestPos[account][
            base
        ][opposite];
        requestPos[last.usr][last.opposite][last.base] = requestPos[account][
            opposite
        ][base];
        requests[requestPos[account][base][opposite] - 1] = requests[
            requests.length - 1
        ];
        delete requestPos[account][base][opposite];
        delete requestPos[account][opposite][base];

        requests.pop();
    }

    function setRequest(address usr, RetireTokenRequest[] calldata tokens)
        public
        override
        role(OWNER)
    {
        address account = usr;
        address base = tokens[0].token;
        address opposite = tokens[1].token;
        int64 baseCount = tokens[0].count;
        int64 oppositeCount = tokens[1].count;
        int64[] memory baseSerials = tokens[0].serials;
        int64[] memory oppositeSerials = tokens[1].serials;
        if (requestPos[account][base][opposite] > 0) {
            address[] memory tokenAddresses = new address[](2);
            tokenAddresses[0] = base;
            tokenAddresses[1] = opposite;
            unsetRequest(account, tokenAddresses);
        }
        requests.push(
            Request(
                account,
                base,
                opposite,
                baseCount,
                oppositeCount,
                baseSerials,
                oppositeSerials
            )
        );
        requestPos[account][base][opposite] = requests.length;
        requestPos[account][opposite][base] = requests.length;
    }
}
