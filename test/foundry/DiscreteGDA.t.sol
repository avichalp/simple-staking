// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "solmate/utils/LibString.sol";
import "../../src/GDA/DiscreteGDA.sol";

contract MockDiscreteGDA is DiscreteGDA {
  constructor(
    string memory _name,
    string memory _symbol,
    SD59x18 _initialPrice,
    SD59x18 _scalerFactor,
    SD59x18 _decayConstant
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
  using LibString for uint256;

  DiscreteGDA public gda;

  SD59x18 public initialPrice = SD59x18.wrap(1000e18);
  // lambda = 1/2
  SD59x18 public decayConstant = div(SD59x18.wrap(1), SD59x18.wrap(2));
  // alpha = 1.1
  SD59x18 public scaleFactor = div(SD59x18.wrap(11), SD59x18.wrap(10));

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
    uint256 initial = uint256(SD59x18.unwrap(initialPrice));
    uint256 purchasePrice = gda.purchasePrice(1);

    // initially the purchace price should be same (within 1/10 of percent)
    // as the calculated purchase price
    assertApproxEqRel(purchasePrice, initial, 1000000000000000);
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

  function testPurchasePriceFixedSoldFixedAmountFFI(uint256 timeSinceStart)
    public
  {
    uint256 numTokensToBuy = 10;
    uint256 numTokensAlreadySold = 10;
    // timeSinceStart * decayConstant < 133.084258667509499441!
    vm.assume(timeSinceStart >= 1 && timeSinceStart < 266);

    // ensure `numTokensAlreadySold` tokens have been sold
    purchaseTokens(numTokensAlreadySold);
    assertEq(gda.currentId(), numTokensAlreadySold);

    // ensure time is rolled forward by `timeSinceStart` seconds
    vm.warp(block.timestamp + timeSinceStart);
    assertEq(block.timestamp, timeSinceStart + 1);

    // calculate the expected price
    int256 expectedPrice = expectedPurchasePriceFFI(
      numTokensToBuy,
      numTokensAlreadySold,
      timeSinceStart
    );

    uint256 actualPrice = gda.purchasePrice(numTokensToBuy);

    // max allowed error percentage: 0.000000000000010000%
    assertApproxEqRel(actualPrice, uint256(expectedPrice), 10000);
  }

  function testPurchasePriceFixedTimeFixedAmountFFI(
    uint256 numTokensAlreadySold
  ) public {
    uint256 numTokensToBuy = 1;
    uint256 timeSinceStart = 10;
    // TODO: not tested for large values of `numTokensAlreadySold`
    vm.assume(numTokensAlreadySold >= 1 && numTokensAlreadySold <= 5);

    // ensure `numTokensAlreadySold` tokens have been sold
    purchaseTokens(numTokensAlreadySold);
    assertEq(gda.currentId(), numTokensAlreadySold);

    // ensure time is rolled forward by `timeSinceStart` seconds
    vm.warp(block.timestamp + timeSinceStart);
    assertEq(block.timestamp, timeSinceStart + 1);

    // calculate the expected price
    int256 expectedPrice = expectedPurchasePriceFFI(
      numTokensToBuy,
      numTokensAlreadySold,
      timeSinceStart
    );

    uint256 actualPrice = gda.purchasePrice(numTokensToBuy);

    assertApproxEqRel(actualPrice, uint256(expectedPrice), 1000);
  }

  function testPurchasePriceFixedSoldFixedTimeFFI(uint256 numTokensToBuy)
    public
  {
    uint256 timeSinceStart = 10;
    uint256 numTokensAlreadySold = 10;

    vm.assume(numTokensToBuy >= 1 && numTokensToBuy <= 5);

    // ensure `numTokensAlreadySold` tokens have been sold
    purchaseTokens(numTokensAlreadySold);
    assertEq(gda.currentId(), numTokensAlreadySold);

    // ensure time is rolled forward by `timeSinceStart` seconds
    vm.warp(block.timestamp + timeSinceStart);
    assertEq(block.timestamp, timeSinceStart + 1);

    // calculate the expected price
    int256 expectedPrice = expectedPurchasePriceFFI(
      numTokensToBuy,
      numTokensAlreadySold,
      timeSinceStart
    );

    uint256 actualPrice = gda.purchasePrice(numTokensToBuy);

    assertApproxEqRel(actualPrice, uint256(expectedPrice), 2000);
  }

  function expectedPurchasePriceFFI(
    uint256 numTokensToBuy,
    uint256 numTokensAlreadySold,
    uint256 timeSinceStart
  ) internal returns (int256) {
    string[] memory inputs = new string[](5);
    inputs[0] = "python3";
    inputs[1] = "script/gda.py";
    inputs[2] = "dgda";
    inputs[3] = "--args";
    inputs[4] = string(
      abi.encodePacked(
        "1.1",
        ", ",
        "0.5",
        ", ",
        timeSinceStart.toString(),
        ", ",
        numTokensToBuy.toString(),
        ", ",
        "1000",
        ", ",
        numTokensAlreadySold.toString()
      )
    );
    return abi.decode(vm.ffi(inputs), (int256));
  }

  function purchaseTokens(uint256 m) internal {
    uint256 purchasePrice = gda.purchasePrice(m);
    // make sure test runnner has funds to purchase tokens
    vm.deal(address(this), purchasePrice);
    gda.purchaseTokens{ value: purchasePrice }(m, address(this));
  }

  receive() external payable {}
}
