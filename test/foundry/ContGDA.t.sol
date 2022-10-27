// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../../src/GDA/ContGDA.sol";

contract MockContGDA is ContGDA {
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
  bytes insufficientTokens =
    abi.encodeWithSignature("InsufficientAvailableTokens()");

  function setUp() public {
    gda = new MockContGDA(
      "Token",
      "TKN",
      initialPrice,
      emissionRate,
      decayConstant
    );
  }

  function testInsufficientPayment() public {
    vm.warp(block.timestamp + 10);
    uint256 purchaseAmount = 5;
    uint256 purchasePrice = gda.purchasePrice(purchaseAmount);
    vm.deal(address(this), purchasePrice);
    vm.expectRevert(insufficientPayment);
    gda.purchaseTokens{ value: purchasePrice - 1 }(
      purchaseAmount,
      address(this)
    );
  }

  function testInsufficientEmissions() public {
    vm.warp(block.timestamp + 10);
    vm.expectRevert(insufficientTokens);
    gda.purchaseTokens(11, address(this));
  }

  function testMintCorrectly() public {
    vm.warp(block.timestamp + 10);
    assertEq(gda.balanceOf(address(this)), 0);
    uint256 purchaseAmount = 5;
    uint256 purchasePrice = gda.purchasePrice(purchaseAmount);
    assertTrue(purchasePrice > 0);
    vm.deal(address(this), purchasePrice);
    gda.purchaseTokens{ value: purchasePrice }(purchaseAmount, address(this));
    assertEq(gda.balanceOf(address(this)), purchaseAmount);
  }

  function testPurchasePrice() public {
    uint256 initial = uint256(initialPrice);
    uint256 quantity = 10;

    vm.warp(block.timestamp + 10);
    uint256 purchasePrice = gda.purchasePrice(quantity);

    assertEq(purchasePrice, 19.865241060018290657e18);
  }

  function testRefund() public {
    vm.warp(block.timestamp + 10);
    uint256 purchasePrice = gda.purchasePrice(1);
    vm.deal(address(this), 2 * purchasePrice);
    gda.purchaseTokens{ value: 2 * purchasePrice }(1, address(this));
    assertTrue(address(this).balance == purchasePrice);
  }

  receive() external payable {}
}
