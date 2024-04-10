// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

import "./RetireCommon.sol";
import "./storage/RetireStorageManager.sol";

abstract contract RetireImplementation is RetireCommon {
    modifier tokenCount(uint8 tc) virtual;

    RetireStorageManager storageManager;
    RetirePoolStorage poolStorage;
    RetireRequestStorage requestStorage;

    constructor(RetireStorageManager sm) {
        storageManager = sm;
        _clearPools();
        _clearRequests();
    }

    function _clearPools() internal {
        poolStorage = abi.decode(
            initStorage(RetireStorageManager.initPoolStorage.selector),
            (RetirePoolStorage)
        );
    }

    function _clearRequests() internal {
        requestStorage = abi.decode(
            initStorage(RetireStorageManager.initRequestStorage.selector),
            (RetireRequestStorage)
        );
    }

    function clearPools(uint8) public override role(ADMIN) {
        _clearPools();
    }

    function clearRequests(uint8) public override role(ADMIN) {
        _clearRequests();
    }

    function initStorage(bytes4 selector) private returns (bytes memory) {
        (bool success, bytes memory result) = address(storageManager)
            .delegatecall(abi.encodeWithSelector(selector));
        require(success);
        return result;
    }

    function getPool(address[] memory tokens)
        public
        view
        override
        tokenCount(uint8(tokens.length))
        returns (RetireTokenPool[] memory, bool)
    {
        return poolStorage.getPool(tokens);
    }

    function setPool(RetireTokenPool[] memory tokens, bool immediately)
        public
        override
        tokenCount(uint8(tokens.length))
        role(ADMIN)
    {
        poolStorage.setPool(tokens, immediately);
    }

    function unsetPool(address[] memory tokens)
        public
        override
        tokenCount(uint8(tokens.length))
        role(ADMIN)
    {
        poolStorage.unsetPool(tokens);
    }

    function getPools(uint8 tc) public view override returns (bytes memory) {
        return poolStorage.getPools(tc);
    }

    function getRequest(address usr, address[] calldata tokens)
        public
        view
        override
        returns (RetireTokenRequest[] memory)
    {
        return requestStorage.getRequest(usr, tokens);
    }

    function setRequest(address usr, RetireTokenRequest[] calldata tokens)
        public
        override
        tokenCount(uint8(tokens.length))
        role(ADMIN)
    {
        requestStorage.setRequest(usr, tokens);
    }

    function unsetRequest(address usr, address[] memory tokens)
        public
        override
        tokenCount(uint8(tokens.length))
        role(ADMIN)
    {
        requestStorage.unsetRequest(usr, tokens);
    }

    function getRequests(uint8 tc) public view override returns (bytes memory) {
        return requestStorage.getRequests(tc);
    }

    function _retire(address usr, RetireTokenRequest[] memory tokens)
        private
    {
        for (uint256 i = 0; i < tokens.length; i++) {
            int32 tokenType = safeGetTokenType(tokens[i].token);
            if (tokenType == 0) {
                wipeContract(tokens[i].token).wipe(
                    tokens[i].token,
                    usr,
                    tokens[i].count
                );
            } else if (tokenType == 1) {
                wipeContract(tokens[i].token).wipeNFT(
                    tokens[i].token,
                    usr,
                    tokens[i].serials
                );
            } else {
                revert('UNSUPPORTED_TOKEN_TYPE');
            }
        }
        emit Retire(usr, tokens);
    }

    // delegateCall
    function retire(RetireTokenRequest[] calldata tokens)
        public
        override
        tokenCount(uint8(tokens.length))
    {
        require(RetireCommon(this).retireCheck(tokens), "RETIRE_CHECK");
        address[] memory tokenAddresses = new address[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            tokenAddresses[i] = tokens[i].token;
        }
        (, bool immediately) = RetireCommon(this).getPool(tokenAddresses);
        if (immediately) {
            _retire(msg.sender, tokens);
        } else {
            RetireCommon(this).setRequest(msg.sender, tokens);
        }
    }

    // delegateCall
    function approveRetire(address usr, address[] calldata tokens)
        public
        override
        tokenCount(uint8(tokens.length))
        role(ADMIN)
    {
        RetireTokenRequest[] memory options = RetireCommon(this)
            .getRequest(usr, tokens);
        _retire(usr, options);
        RetireCommon(this).unsetRequest(usr, tokens);
    }

    function _getTokenCount(RetireTokenRequest calldata opt)
        internal
        returns (int64)
    {
        int32 tokenType = safeGetTokenType(opt.token);
        int64 count;
        if (tokenType == 0) {
            count = opt.count;
        } else if (tokenType == 1){
            count = int64(int256(opt.serials.length));
            require(count <= 10, 'NFTS_LIMIT');
        } else {
            revert('UNSUPPORTED_TOKEN_TYPE');
        }
        return count;
    }
}
