pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

abstract contract Version {
    event Version(uint256[3]);

    constructor() {
        emit Version(ver());
    }

    function ver() virtual public pure returns (uint256[3] memory) {
        return [uint256(1),0,0];
    }
}
