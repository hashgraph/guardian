// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

import "./hedera-smart-contracts/hts-precompile/HederaTokenService.sol";
import "./hedera-smart-contracts/hts-precompile/HederaResponseCodes.sol";

contract RetirementContract is HederaTokenService {
    address contractOwner;
    mapping (address => bool) users;
    mapping (address => bool) associatedTokens;

    struct TokenRate { 
        uint32 baseTokenCount;
        uint32 oppositeTokenCount;
    }
    mapping (address => mapping (address => TokenRate)) tokenPairs;

    struct UserRequest {
        uint32 baseTokenCount;
        uint32 oppositeTokenCount;
        int64[] baseTokenSerials;
        int64[] oppositeTokenSerials;
    }
    mapping (address => mapping(address => mapping(address => UserRequest))) userRequests;

    constructor() {
        contractOwner = msg.sender;
    }

    function getOwner() public view returns (address) {
        return contractOwner;
    }

    function addUser(address user) external {
        if (contractOwner != msg.sender) {
            revert();
        }
        users[user] = true;
    }
    
    function grantKyc(address token) private {
        (bool suc, bytes memory res) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.isKyc.selector, token, address(this)));
        (int64 kycRes, bool kycGranted) = suc ? abi.decode(res, (int32, bool)) : (HederaResponseCodes.UNKNOWN, false);
         if (kycRes == HederaResponseCodes.SUCCESS && !kycGranted) {
            precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.grantTokenKyc.selector, token, address(this)));
        }
    }
    
    function associate(address token) private {
        if (associatedTokens[token] == false) {
            HederaTokenService.associateToken(address(this), token);
            associatedTokens[token] = true;
        }
    }

    function addPair(address baseToken, address oppositeToken, uint32 baseTokenCount, uint32 oppositeTokenCount) external {
        if (contractOwner != msg.sender && users[msg.sender] == false) {
            revert();
        }
        if (baseTokenCount <= 0 || oppositeTokenCount <= 0) {
            revert();
        }
        if (baseToken == oppositeToken) {
            revert();
        }
        associate(baseToken);
        associate(oppositeToken);
        grantKyc(baseToken);
        grantKyc(oppositeToken);
        tokenPairs[baseToken][oppositeToken] = TokenRate(baseTokenCount, oppositeTokenCount);
        tokenPairs[oppositeToken][baseToken] = TokenRate(oppositeTokenCount, baseTokenCount);
    }

    function getUserRequest(address user, address baseToken, address oppositeToken) public view returns (uint32, uint32, uint32, uint32) {
        UserRequest memory ur = userRequests[user][baseToken][oppositeToken];
        return (ur.baseTokenCount, ur.oppositeTokenCount, uint32(ur.baseTokenSerials.length), uint32(ur.oppositeTokenSerials.length));
    }

    function addUserRequest(address baseToken, address oppositeToken, uint32 baseTokenCount, uint32 oppositeTokenCount, int64[] memory baseTokenSerials, int64[] memory oppositeTokenSerials) external {
        uint32 baseTokenCountPair = tokenPairs[baseToken][oppositeToken].baseTokenCount;
        uint32 oppositeTokenCountPair = tokenPairs[baseToken][oppositeToken].oppositeTokenCount;

        if ((baseTokenCountPair == 0) && (oppositeTokenCountPair == 0)) {
            revert();
        }

        if (baseTokenSerials[0] == 0) {
            baseTokenSerials = new int64[](0);
        }
        if (oppositeTokenSerials[0] == 0) {
            oppositeTokenSerials = new int64[](0);
        }

        if (baseTokenCount != 0 && oppositeTokenCount != 0 && baseTokenSerials.length == 0 && oppositeTokenSerials.length == 0) {
            addUserRequest_FT_FT(baseToken, oppositeToken, baseTokenCount, oppositeTokenCount, baseTokenCountPair, oppositeTokenCountPair);
        } else if (baseTokenCount != 0 && oppositeTokenCount == 0 && baseTokenSerials.length == 0 && oppositeTokenSerials.length != 0) {
            addUserRequest_FT_NFT(baseToken, oppositeToken, baseTokenCount, oppositeTokenSerials, baseTokenCountPair, oppositeTokenCountPair);
        } else if (baseTokenCount == 0 && oppositeTokenCount != 0 && baseTokenSerials.length != 0 && oppositeTokenSerials.length == 0) {
            addUserRequest_FT_NFT(oppositeToken, baseToken, oppositeTokenCount, baseTokenSerials, oppositeTokenCountPair, baseTokenCountPair);
        } else if (baseTokenCount == 0 && oppositeTokenCount == 0 && baseTokenSerials.length != 0 && oppositeTokenSerials.length != 0) {
            addUserRequest_NFT_NFT(baseToken, oppositeToken, baseTokenSerials, oppositeTokenSerials, baseTokenCountPair, oppositeTokenCountPair);
        }
    }

    function addUserRequest_FT_FT(address baseToken, address oppositeToken, uint32 baseTokenCount, uint32 oppositeTokenCount, uint32 baseTokenCountPair, uint32 oppositeTokenCountPair) private {
        if ((baseTokenCount % baseTokenCountPair) != 0) {
            revert();
        }

        uint32 rate = baseTokenCount / baseTokenCountPair;
        uint32 oppositeTokenCountCheck = rate * oppositeTokenCountPair;

        if (oppositeTokenCountCheck != oppositeTokenCount) {
            revert();
        }
        int resCode;
        resCode = HederaTokenService.transferToken(baseToken, msg.sender, address(this), int32(baseTokenCount));
        if (resCode != HederaResponseCodes.SUCCESS) {
            revert();
        }
        resCode = HederaTokenService.transferToken(oppositeToken, msg.sender, address(this), int32(oppositeTokenCount));
        if (resCode != HederaResponseCodes.SUCCESS) {
            HederaTokenService.transferToken(baseToken, address(this), msg.sender, int32(baseTokenCount));
            revert();
        }

        userRequests[msg.sender][baseToken][oppositeToken].baseTokenCount +=  baseTokenCount;
        userRequests[msg.sender][baseToken][oppositeToken].oppositeTokenCount += oppositeTokenCount;
        userRequests[msg.sender][oppositeToken][baseToken].baseTokenCount += oppositeTokenCount;
        userRequests[msg.sender][oppositeToken][baseToken].oppositeTokenCount += baseTokenCount;
    }

    function addUserRequest_FT_NFT(address baseToken, address oppositeToken, uint32 baseTokenCount, int64[] memory oppositeTokenSerials, uint32 baseTokenCountPair, uint32 oppositeTokenCountPair) private {
        if ((baseTokenCount % baseTokenCountPair) != 0) {
            revert();
        }

        uint32 rate = baseTokenCount / baseTokenCountPair;
        uint32 oppositeTokenCountCheck = rate * oppositeTokenCountPair;

        if (oppositeTokenCountCheck != oppositeTokenSerials.length) {
            revert();
        }
        int responseCode;
        responseCode = HederaTokenService.transferToken(baseToken, msg.sender, address(this), int32(baseTokenCount));
        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }
        for(uint256 i = 0; i < oppositeTokenSerials.length; i++) {
            responseCode = HederaTokenService.transferNFT(oppositeToken, msg.sender, address(this), oppositeTokenSerials[i]);
            if (responseCode != HederaResponseCodes.SUCCESS) {
                HederaTokenService.transferToken(baseToken, msg.sender, address(this), int32(baseTokenCount));
                for(uint256 j = i-1; j >= 0; j--) {
                    HederaTokenService.transferNFT(oppositeToken, address(this), msg.sender, oppositeTokenSerials[j]);
                }
                revert();
            }
        }

        int64[] memory oppositeTokenSerialsRequest = userRequests[msg.sender][baseToken][oppositeToken].oppositeTokenSerials;
        int64[] memory newOppositeTokenSerials = oppositeTokenSerials;
        if (oppositeTokenSerialsRequest.length > 0) {
            newOppositeTokenSerials = new int64[](oppositeTokenSerialsRequest.length + oppositeTokenSerials.length);
            for (uint256 i = 0; i < oppositeTokenSerialsRequest.length; i++) {
                newOppositeTokenSerials[i] = oppositeTokenSerialsRequest[i];
            }
            for (uint256 i = 0; i < oppositeTokenSerials.length; i++) {
                newOppositeTokenSerials[oppositeTokenSerialsRequest.length + i] = oppositeTokenSerials[i];
            }
        }
        
        userRequests[msg.sender][baseToken][oppositeToken].oppositeTokenSerials = newOppositeTokenSerials;
        userRequests[msg.sender][oppositeToken][baseToken].baseTokenSerials = newOppositeTokenSerials;
        userRequests[msg.sender][baseToken][oppositeToken].baseTokenCount +=  baseTokenCount;
        userRequests[msg.sender][oppositeToken][baseToken].oppositeTokenCount += baseTokenCount;
    }

    function addUserRequest_NFT_NFT(address baseToken, address oppositeToken, int64[] memory baseTokenSerials, int64[] memory oppositeTokenSerials, uint32 baseTokenCountPair, uint32 oppositeTokenCountPair) private {
        if ((baseTokenSerials.length % baseTokenCountPair) != 0) {
            revert();
        }

        uint256 rate = baseTokenSerials.length / baseTokenCountPair;
        uint256 oppositeTokenCount = (rate * (oppositeTokenCountPair));

        if (oppositeTokenSerials.length != oppositeTokenCount) {
            revert();
        }

        for(uint256 i = 0; i < baseTokenSerials.length; i++) {
            (int responseCode) = HederaTokenService.transferNFT(baseToken, msg.sender, address(this), baseTokenSerials[i]);
            if (responseCode != HederaResponseCodes.SUCCESS) {
                for(uint256 j = i-1; j >= 0; j--) {
                    HederaTokenService.transferNFT(baseToken, address(this), msg.sender, baseTokenSerials[j]);
                }
                revert();
            }
        }
        for(uint256 i = 0; i < oppositeTokenSerials.length; i++) {
            (int responseCode) = HederaTokenService.transferNFT(oppositeToken, msg.sender, address(this), oppositeTokenSerials[i]);
            if (responseCode != HederaResponseCodes.SUCCESS) {
                for(uint256 j = 0; j < baseTokenSerials.length; j++) {
                    HederaTokenService.transferNFT(baseToken, address(this), msg.sender, baseTokenSerials[j]);
                }
                for(uint256 j = i-1; j >= 0; j--) {
                    HederaTokenService.transferNFT(oppositeToken, address(this), msg.sender, oppositeTokenSerials[j]);
                }
                revert();
            }
        }

        int64[] memory baseTokenSerialsRequest = userRequests[msg.sender][baseToken][oppositeToken].baseTokenSerials;
        int64[] memory newBaseTokenSerials = baseTokenSerials;
        if (baseTokenSerialsRequest.length > 0) {
            newBaseTokenSerials = new int64[](baseTokenSerialsRequest.length + baseTokenSerials.length);
            for (uint256 i = 0; i < baseTokenSerialsRequest.length; i++) {
                newBaseTokenSerials[i] = baseTokenSerialsRequest[i];
            }
            for (uint256 i = 0; i < baseTokenSerials.length; i++) {
                newBaseTokenSerials[baseTokenSerialsRequest.length + i] = baseTokenSerials[i];
            }
        }

        int64[] memory oppositeTokenSerialsRequest = userRequests[msg.sender][baseToken][oppositeToken].oppositeTokenSerials;
        int64[] memory newOppositeTokenSerials = oppositeTokenSerials;
        if (oppositeTokenSerialsRequest.length > 0) {
            newOppositeTokenSerials = new int64[](oppositeTokenSerialsRequest.length + oppositeTokenSerials.length);
            for (uint256 i = 0; i < oppositeTokenSerialsRequest.length; i++) {
                newOppositeTokenSerials[i] = oppositeTokenSerialsRequest[i];
            }
            for (uint256 i = 0; i < oppositeTokenSerials.length; i++) {
                newOppositeTokenSerials[oppositeTokenSerialsRequest.length + i] = oppositeTokenSerials[i];
            }
        }
        
        userRequests[msg.sender][baseToken][oppositeToken].baseTokenSerials = newBaseTokenSerials;
        userRequests[msg.sender][baseToken][oppositeToken].oppositeTokenSerials = newOppositeTokenSerials;
        userRequests[msg.sender][oppositeToken][baseToken].baseTokenSerials = newOppositeTokenSerials;
        userRequests[msg.sender][oppositeToken][baseToken].oppositeTokenSerials = newBaseTokenSerials;
    }

    function backNFT(address token, int64[] memory ser) private returns (int) {
        for(uint256 j = 0; j < ser.length; j++) {
            HederaTokenService.transferNFT(token, address(this), msg.sender, ser[j]);
        }
        return HederaResponseCodes.SUCCESS;
    }

    function cancelUserRequest(
        address baseToken,
        address oppositeToken
    ) external {
        cancelOrRetire(false, msg.sender, baseToken, oppositeToken);
    }

    function retire(
        address user,
        address baseToken,
        address oppositeToken
    ) external {
        cancelOrRetire(true, user, baseToken, oppositeToken);
    }
    

    function cancelOrRetire(
        bool retire, 
        address user,
        address baseToken,
        address oppositeToken
    ) private {
        uint32 baseTokenCount = userRequests[user][baseToken][oppositeToken].baseTokenCount;
        uint32 oppositeTokenCount = userRequests[user][baseToken][oppositeToken].oppositeTokenCount;
        int64[] memory baseTokenSerials = userRequests[user][baseToken][oppositeToken].baseTokenSerials;
        int64[] memory oppositeTokenSerials = userRequests[user][baseToken][oppositeToken].oppositeTokenSerials;
        if (baseTokenCount + oppositeTokenCount + baseTokenSerials.length + oppositeTokenSerials.length == 0) {
            revert();
        }
        if (baseTokenCount > 0) {
            (int responseCode) = retire ? HederaTokenService.wipeTokenAccount(baseToken, address(this),  baseTokenCount) : HederaTokenService.transferToken(baseToken, address(this), msg.sender, int32(baseTokenCount));
            if (responseCode == HederaResponseCodes.SUCCESS) {
                userRequests[user][baseToken][oppositeToken].baseTokenCount = 0;
                userRequests[user][oppositeToken][baseToken].oppositeTokenCount = 0;
            }
        }
        if (oppositeTokenCount > 0) {
            (int responseCode) = retire ? HederaTokenService.wipeTokenAccount(oppositeToken, address(this),  oppositeTokenCount) : HederaTokenService.transferToken(oppositeToken, address(this), msg.sender, int32(oppositeTokenCount));
            if (responseCode == HederaResponseCodes.SUCCESS) {
                userRequests[user][baseToken][oppositeToken].oppositeTokenCount = 0;
                userRequests[user][oppositeToken][baseToken].baseTokenCount = 0;
            }
        }
        if (baseTokenSerials.length > 0) {
            (int responseCode) = retire ? HederaTokenService.wipeTokenAccountNFT(baseToken, address(this),  baseTokenSerials) : backNFT(baseToken, baseTokenSerials);
            if (responseCode == HederaResponseCodes.SUCCESS) {
                userRequests[user][baseToken][oppositeToken].baseTokenSerials = new int64[](0);
                userRequests[user][oppositeToken][baseToken].oppositeTokenSerials = new int64[](0);
            }
        }
        if (oppositeTokenSerials.length > 0) {
            (int responseCode) = retire ? HederaTokenService.wipeTokenAccountNFT(oppositeToken, address(this),  oppositeTokenSerials) : backNFT(oppositeToken, oppositeTokenSerials);
            if (responseCode == HederaResponseCodes.SUCCESS) {
                userRequests[user][baseToken][oppositeToken].oppositeTokenSerials = new int64[](0);
                userRequests[user][oppositeToken][baseToken].baseTokenSerials = new int64[](0);
            }
        }
    }

    function getPair(address baseToken, address oppositeToken) public view returns (uint32 baseTokenCount, uint32 oppositeTokenCount) {
        return (tokenPairs[baseToken][oppositeToken].baseTokenCount, tokenPairs[baseToken][oppositeToken].oppositeTokenCount);
    }
    
    function checkStatus() public view returns (bool) {
        return users[msg.sender]==true;
    }
}
