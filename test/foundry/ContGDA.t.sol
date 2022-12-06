// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "lib/forge-std/src/Test.sol";
import "solmate/utils/LibString.sol";
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
  using LibString for uint256;

  ContGDA public gda;

  // k = 10
  int256 public initialPrice = 10e18;
  // lambda = 1/2
  int256 public decayConstant = 5e17;
  // r = 1
  int256 public emissionRate = 1e18;

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

  function testRate() public {
    vm.warp(block.timestamp + 10);
    uint256 purchasePrice = gda.purchasePrice(10e18);
    vm.deal(address(this), purchasePrice);
    gda.purchaseTokens{ value: purchasePrice }(10e18, address(this));
    vm.warp(block.timestamp + 10);
    uint256 purchasePrice2 = gda.purchasePrice(10e18);
    vm.deal(address(this), purchasePrice2);
    gda.purchaseTokens{ value: purchasePrice2 }(10e18, address(this));
    assertEq(gda.balanceOf(address(this)), 20);
  }

  function testPurchasePrice() public {
    vm.warp(block.timestamp + 10);
    assertEq(gda.purchasePrice(0), 0);
    assertEq(gda.purchasePrice(1e18), 0.087420990783136787e18);
    assertEq(gda.purchasePrice(4e18), 0.860982427375569517e18);
    assertEq(gda.purchasePrice(9e18), 11.995854254270959130e18);
    assertEq(gda.purchasePrice(10e18), 19.865241060018290658e18);
  }

  function testPurchasePriceFixedTimeFFI(uint256 numTokensToBuy) public {
    uint256 timeSinceStart = 10;
    vm.warp(block.timestamp + timeSinceStart);
    vm.assume(numTokensToBuy >= 1 && numTokensToBuy <= 120);

    uint256 purchasePrice = gda.purchasePrice(numTokensToBuy * 1e18);
    int256 pyPurchasePrice = expectedPurchasePriceFFI(
      timeSinceStart,
      numTokensToBuy
    );
    assertApproxEqRel(purchasePrice, uint256(pyPurchasePrice), 1000);
  }

  function testPurchasePriceFixedAmountFFI(uint256 timeSinceStart) public {
    vm.assume(timeSinceStart >= 1 && timeSinceStart <= 250);
    vm.warp(block.timestamp + timeSinceStart);

    int256 emissionRateWad = emissionRate;
    uint256 numTokensToBuyWad = uint256(
      muldiv(emissionRateWad, int256(timeSinceStart * 1e18), 1e18)
    );

    uint256 purchasePrice = gda.purchasePrice(numTokensToBuyWad);
    int256 pyPurchasePrice = expectedPurchasePriceFFI(
      timeSinceStart,
      numTokensToBuyWad / 1e18
    );
    assertApproxEqRel(purchasePrice, uint256(pyPurchasePrice), 1000);
  }

  function expectedPurchasePriceFFI(
    uint256 timeSinceStart,
    uint256 numTokensToBuy
  ) internal returns (int256) {
    string[] memory inputs = new string[](5);
    inputs[0] = "python3";
    inputs[1] = "script/gda.py";
    inputs[2] = "cgda";
    inputs[3] = "--args";
    inputs[4] = string(
      abi.encodePacked(
        "1",
        ", ",
        "0.5",
        ", ",
        timeSinceStart.toString(),
        ", ",
        numTokensToBuy.toString(),
        ", ",
        "10"
      )
    );
    return abi.decode(vm.ffi(inputs), (int256));
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
