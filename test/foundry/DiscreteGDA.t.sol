// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../../src/DiscreteGDA.sol";

contract MockDiscreteGDA is DiscreteGDA {
  constructor(
    string memory _name,
    string memory _symbol,
    int256 _initialPrice,
    int256 _scalerFactor,
    int256 _decayConstant
  ) DiscreteGDA(_name, _symbol, _initialPrice, _scalerFactor, _decayConstant) {}

  function tokenURI(uint256)
    public
    pure
    virtual
    override
    returns (string memory)
  {}
}

contract DiscreteGDATest is Test {
  using PRBMathSD59x18 for int256;

  DiscreteGDA public gda;

  int256 public initialPrice = PRBMathSD59x18.fromInt(1000);
  // lambda = 1/2
  int256 public decayConstant =
    PRBMathSD59x18.fromInt(1).div(PRBMathSD59x18.fromInt(2));
  // alpha = 1.1
  int256 public scaleFactor =
    PRBMathSD59x18.fromInt(11).div(PRBMathSD59x18.fromInt(10));

  bytes insufficientPayment = abi.encodeWithSignature("InsufficientPayment()");

  function setUp() public {
    gda = new MockDiscreteGDA(
      "Token",
      "TKN",
      initialPrice,
      scaleFactor,
      decayConstant
    );
  }

  function testInitialPrice() public {
    uint256 initial = uint256(initialPrice);
    uint256 quantity = 1;
    uint256 purchasePrice = gda.purchasePrice(quantity);

    // initially the purchace price should be same (within 1/10 of percent)
    // as the calculated purchase price
    assertApproxEqRel(purchasePrice, initial, 1_000000_000000000);
  }

  function testInsufficientPayment() public {
    uint256 quantity = 1;
    uint256 purchasePrice = gda.purchasePrice(quantity);
    vm.deal(address(this), purchasePrice);
    vm.expectRevert(insufficientPayment);
    // try to buy `quantity` amount of tokens for 1 wei less than the price
    gda.purchaseTokens{ value: purchasePrice - 1 }(quantity, address(this));
  }

  function testMintCorrectly() public {
    // assertTrue(gda.ownerOf(1) != address(this));
    uint256 quantity = 1;
    uint256 purchasePrice = gda.purchasePrice(quantity);
    vm.deal(address(this), purchasePrice);
    // use purchase price to buy the tokens
    gda.purchaseTokens{ value: purchasePrice }(quantity, address(this));
    assertTrue(gda.ownerOf(1) == address(this));
  }

  function testRefund() public {
    uint256 quantity = 1;
    uint256 purchasePrice = gda.purchasePrice(quantity);
    vm.deal(address(this), 2 * purchasePrice);
    // pay twice, should get back the amount
    gda.purchaseTokens{ value: 2 * purchasePrice }(quantity, address(this));
    assertTrue(address(this).balance == purchasePrice);
  }

  function testPurchasePrice(
    uint8 quantity,
    uint8 numTokens,
    uint8 timeSinceStart
  ) public {
    // purchase m initial tokens for setup
    purchaseTokens(uint256(numTokens));

    vm.warp(block.timestamp + timeSinceStart);
    uint256 expectedPrice = expectedPurchasePrice(
      uint256(quantity),
      timeSinceStart
    );
    // calculate the new price
    uint256 actualPrice = gda.purchasePrice(uint256(quantity));

    assertEq(expectedPrice, actualPrice);
  }

  function expectedPurchasePrice(uint256 quantity, uint256 timeSinceStart)
    internal
    returns (uint256)
  {
    int256 num1 = initialPrice.mul(scaleFactor.powu(gda.currentId()));
    int256 num2 = scaleFactor.pow(int256(quantity).fromInt()) -
      PRBMathSD59x18.fromInt(1);
    int256 den1 = decayConstant.mul(int256(timeSinceStart).fromInt()).exp();
    int256 den2 = scaleFactor - PRBMathSD59x18.fromInt(1);

    int256 expectedPrice = num1.mul(num2).div(den1.mul(den2));
    return uint256(expectedPrice);
  }

  function purchaseTokens(uint256 m) internal {
    uint256 purchasePrice = gda.purchasePrice(m);
    // make sure test runnner has funds to purchase tokens
    vm.deal(address(this), purchasePrice);
    gda.purchaseTokens{ value: purchasePrice }(m, address(this));
  }

  receive() external payable {}
}
