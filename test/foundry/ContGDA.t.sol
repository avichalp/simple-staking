// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "lib/forge-std/src/Test.sol";
import "../../src/GDA/ContGDA.sol";

contract MockContGDA is ContGDA {
  constructor(
    string memory _name,
    string memory _symbol,
    SD59x18 _initialPrice,
    SD59x18 _emissionRate,
    SD59x18 _decayConstant
  ) ContGDA(_name, _symbol, _initialPrice, _emissionRate, _decayConstant) {}
}

contract ContGDATest is Test {
  ContGDA public gda;

  // k = 10
  SD59x18 public initialPrice = SD59x18.wrap(10e18);
  // lambda = 1/2
  SD59x18 public decayConstant = SD59x18.wrap(1e18).div(SD59x18.wrap(2e18));
  // r = 1
  SD59x18 public emissionRate = SD59x18.wrap(1e18);

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
    uint256 purchaseAmount = 5e18;
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
    gda.purchaseTokens(11e18, address(this));
  }

  function testMintCorrectly() public {
    vm.warp(block.timestamp + 10);
    assertEq(gda.balanceOf(address(this)), 0);
    uint256 purchaseAmount = 5;
    uint256 purchasePrice = gda.purchasePrice(purchaseAmount * 1e18);
    assertTrue(purchasePrice > 0);
    vm.deal(address(this), purchasePrice);
    gda.purchaseTokens{ value: purchasePrice }(
      purchaseAmount * 1e18,
      address(this)
    );
    assertEq(gda.balanceOf(address(this)), purchaseAmount);
  }

  function testPurchasePrice() public {
    SD59x18 initial = initialPrice;
    uint256 quantity = 10e18;

    vm.warp(block.timestamp + 10);
    uint256 purchasePrice = gda.purchasePrice(quantity);

    assertEq(purchasePrice, 19.865241060018290657e18);
  }

  function testRefund() public {
    vm.warp(block.timestamp + 10);
    uint256 purchasePrice = gda.purchasePrice(1e18);
    vm.deal(address(this), 2 * purchasePrice);
    gda.purchaseTokens{ value: 2 * purchasePrice }(1e18, address(this));
    assertTrue(address(this).balance == purchasePrice);
  }

  receive() external payable {}
}
