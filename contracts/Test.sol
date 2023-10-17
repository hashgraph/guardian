// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.11;

abstract contract IP {
    int8 public a = 1;
    int8 public b = 2;
    int8 public c = 3;
    int8 public d = 4;
    int8 public e = 5;
    int8 public f = 6;

    function test123() public virtual;
}

contract PlaygroundTest is IP {
  

  function test123() public override {
      b = 10;
  }
}

contract Playground {
    int256 public a = 5;


    function test(address ip) public { 
      (bool success, ) = ip.delegatecall(abi.encodeWithSelector(IP.test123.selector));
      require(success);
    }

    function getB(address ip) public view returns (int8) {
      return IP(ip).b();
    }

    function getA() public view returns (int256) {
      return a;
    }
}