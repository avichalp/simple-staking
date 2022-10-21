// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../../src/ContGDA.sol";

contract MockDiscreteGDA is ContGDA {
  constructor(
    string memory _name,
    string memory _symbol,
    int256 _initialPrice,
    int256 _emissionRate,
    int256 _decayConstant
  ) ContGDA(_name, _symbol, _initialPrice, _emissionRate, _decayConstant) {}
}

contract ContGDATest is Test {
  using PRBMathSD59x18 for int256;

  ContGDA public gda;

  // k = 10
  int256 public initialPrice = PRBMathSD59x18.fromInt(10);
  // lambda = 1/2
  int256 public decayConstant =
    PRBMathSD59x18.fromInt(1).div(PRBMathSD59x18.fromInt(2));
  // r = 1
  int256 public emissionRate = PRBMathSD59x18.fromInt(1);

  bytes insufficientPayment = abi.encodeWithSignature("InsufficientPayment()");

  function setUp() public {
    gda = new MockDiscreteGDA(
      "Token",
      "TKN",
      initialPrice,
      emissionRate,
      decayConstant
    );
  }

  function testPurchasePrice() public {
    uint256 initial = uint256(initialPrice);
    uint256 quantity = 10;

    vm.warp(block.timestamp + 10);
    uint256 purchasePrice = gda.purchasePrice(quantity);

    // initially the purchace price should be same (within 1/10 of percent)
    // as the calculated purchase price
    assertApproxEqRel(purchasePrice, initial, 1_000000_000000000);
  }
}
