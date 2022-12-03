// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../../src/Mathutil.sol";
import "solmate/utils/LibString.sol";

contract MathutilTest is Test, Mathutil {
  using LibString for uint256;

  function testMul512() public {
    uint256 a = type(uint256).max;
    uint256 b = type(uint256).max - 1;
    (uint256 r0, uint256 r1) = mul512(a, b);
    assertEq(r0, 2);
    assertEq(
      r1,
      115792089237316195423570985008687907853269984665640564039457584007913129639933
    );

    // when one number is 0
    a = 0;
    (r0, r1) = mul512(a, b);
    assertEq(r0, 0);
    assertEq(r1, 0);

    // when one number is 1
    a = 1;
    (r0, r1) = mul512(a, b);
    assertEq(r0, b);
    assertEq(r1, 0);
  }

  function testMul512(uint256 a, uint256 b) public {
    vm.assume(b > 1);
    (uint256 r0, uint256 r1) = mul512(a, b);
    (uint256 r2, uint256 r3) = div512(r0, r1, b);
    assertEq(r2, a);
    assertEq(r3, 0);
  }

  function testDiv512() public {
    uint256 a0 = 115792089237316195423570985008687907853269984665640564039457584007913129639935;
    uint256 a1 = 115792089237316195423570985008687907853269984665640564039457584007913129639935;
    uint256 b = 115792089237316195423570985008687907853269984665640564039457584007913129639935;

    (uint256 r0, uint256 r1) = div512(a0, a1, b);
    // (a * 2^256 +a) / a -> 1*2^256 +1
    assertEq(r0, 1);
    assertEq(r1, 1);

    a0 = 115792089237316195423570985008687907853269984665640564039457584007913129639935;
    a1 = 1;
    b = 115792089237316195423570985008687907853269984665640564039457584007913129639935;
    (r0, r1) = div512(a0, a1, b);
    assertEq(r0, 2);
    assertEq(r1, 0);
  }

  function testSub512(
    uint256 a0,
    uint256 a1,
    uint256 b0,
    uint256 b1
  ) public {
    (uint256 r0, uint256 r1) = sub512(a0, a1, b0, b1);
    unchecked {
      assertEq(r0 + b0, a0);
      if (b0 > a0) {
        assertEq(r1 + b1 + 1, a1);
      } else {
        assertEq(r1 + b1, a1);
      }
    }
  }

  function testAdd512(
    uint256 a0,
    uint256 a1,
    uint256 b0,
    uint256 b1
  ) public {
    (uint256 r0, uint256 r1) = add512(a0, a1, b0, b1);
    unchecked {
      assertEq(b0, r0 - a0);
      if (r0 < a0) {
        assertEq(b1, r1 - a1 - 1);
      } else {
        assertEq(b1, r1 - a1);
      }
    }
  }

  function testInv256(uint256 a) public {
    vm.assume(a > 1);
    uint256 r = inv256(a);
    if (r == 0) {
      assertEq(r, 0);
    } else {
      unchecked {
        assertEq(a * r, 1);
      }
    }
  }

  function testTwoDivisors(uint256 a) public {
    vm.assume(a > 1);
    vm.assume(a % 2 == 0);
    uint256 result = twoDivisor(a);
    assertTrue(a % result == 0);
    assertTrue(result % 2 == 0);
    // result must be a power of 2
    // find the rightmost set bit and check
    // if it is equal to the result
    assertTrue(result == result & ~(result - 1));
  }

  function testDiv256() public {
    assertEq(div256(2), 2**255);
    assertEq(div256(4), 2**254);
    assertEq(div256(1), 0);
  }

  function testMod256() public {
    assertEq(mod256(2), 0);
    assertEq(mod256(type(uint256).max), 1);
  }

  function testExpWadLowerBound() public {
    assertEq(expWad(-43e18), 0);
  }

  function testExpWadOverflow() public {
    vm.expectRevert("EXP_OVERFLOW");
    expWad(136e18);
  }

  function testExpWad() public {
    assertEq(expWad(1e18), 2718281828459045235);
    assertEq(expWad(0e18), 1e18);
    assertEq(expWad(2e18), 7389056098930650227);
    assertEq(expWad(2718281828459045235), 15154262241479264184); // e^e
  }

  function testLog2() public {
    assertEq(log2Wad(0e18), 0);
    assertEq(log2Wad(1e18), 0);
    assertEq(log2Wad(9e18), 3169925001442312346);
    assertEq(log2Wad(256e18), 8e18);
    //
    // max allowed integer part for fixed point 60.18
    // type(uint256).max/1e18
    // 115792089237316195423570985008687907853269984665640564039457.000..(18 zeros)
    assertEq(
      log2Wad(115792089237316195423570985008687907853269984665640564039457e18),
      196205294292027477728
    );
    assertEq(
      log2Wad(
        115792089237316195423570985008687907853269984665640564039457_584007913129639935
      ),
      196205294292027477728
    );
  }

  function testLog2FFI() public {
    uint256 n = 9;
    int256 pyResult = abi.decode(ffi("log2", n.toString()), (int256));
    uint256 solResult = log2Wad(9e18);
    assertApproxEqAbs(solResult, uint256(pyResult), 500);

    n = 256;
    pyResult = abi.decode(ffi("log2", n.toString()), (int256));
    solResult = log2Wad(256e18);
    assertApproxEqAbs(solResult, uint256(pyResult), 500);

    n = 115792089237316195423570985008687907853269984665640564039457;
    pyResult = abi.decode(ffi("log2", n.toString()), (int256));
    solResult = log2Wad(
      115792089237316195423570985008687907853269984665640564039457e18
    );
    assertApproxEqAbs(solResult, uint256(pyResult), 5000);

    uint256 nWhole = 115792089237316195423570985008687907853269984665640564039457;
    uint256 nFrac = 584007913129639935;
    string memory arg = string(
      abi.encodePacked(nWhole.toString(), ".", nFrac.toString())
    );
    pyResult = abi.decode(ffi("log2", arg), (int256));
    solResult = log2Wad(
      115792089237316195423570985008687907853269984665640564039457584007913129639935
    );
    assertApproxEqAbs(solResult, uint256(pyResult), 5000);
  }

  function ffi(string memory func, string memory args)
    internal
    returns (bytes memory)
  {
    string[] memory inputs = new string[](6);
    inputs[0] = "python3";
    inputs[1] = "script/mathutil.py";
    inputs[2] = func;
    inputs[3] = "--args";
    inputs[4] = args;
    bytes memory output = vm.ffi(inputs);
    return output;
  }

  function testLnWad() public {
    assertEq(lnWad(0e18), 0);
    assertEq(lnWad(1e18), 0);
    assertEq(lnWad(9e18), 2197224577336219371);
    assertEq(lnWad(256e18), 5545177444479562476);
    //
    // max allowed integer part for fixed point 60.18
    // type(uint256).max/1e18
    // 115792089237316195423570985008687907853269984665640564039457.000..(18 zeros)
    assertEq(
      lnWad(115792089237316195423570985008687907853269984665640564039457e18),
      135999146549453176925
    );
    assertEq(
      lnWad(
        115792089237316195423570985008687907853269984665640564039457_584007913129639935
      ),
      135999146549453176925
    );
  }

  function testLnWadFFI() public {
    uint256 n = 9;
    int256 pyResult = abi.decode(ffi("ln", n.toString()), (int256));
    uint256 solResult = lnWad(9e18);
    assertApproxEqAbs(solResult, uint256(pyResult), 500);

    n = 256;
    pyResult = abi.decode(ffi("ln", n.toString()), (int256));
    solResult = lnWad(256e18);
    assertApproxEqAbs(solResult, uint256(pyResult), 500);

    n = 115792089237316195423570985008687907853269984665640564039457;
    pyResult = abi.decode(ffi("ln", n.toString()), (int256));
    solResult = lnWad(
      115792089237316195423570985008687907853269984665640564039457e18
    );
    assertApproxEqAbs(solResult, uint256(pyResult), 5000);

    uint256 nWhole = 115792089237316195423570985008687907853269984665640564039457;
    uint256 nFrac = 584007913129639935;
    string memory arg = string(
      abi.encodePacked(nWhole.toString(), ".", nFrac.toString())
    );
    pyResult = abi.decode(ffi("ln", arg), (int256));
    solResult = lnWad(
      115792089237316195423570985008687907853269984665640564039457_584007913129639935
    );
    assertApproxEqAbs(solResult, uint256(pyResult), 5000);
  }

  function testMuldiv(uint256 b) public {
    vm.assume(
      b <= 115792089237316195423570985008687907853269984665640564039457
    );

    assertEq(muldiv(1e18, b, 1e18), b);
    assertEq(muldiv(2e18, b, 1e18), 2 * b);
    assertEq(muldiv(3e18, b, 1e18), 3 * b);
    assertEq(muldiv(1e36, b, 1e18), 1e18 * b);
  }

  function testMuldivFail() public {
    vm.expectRevert("prod1 > denominator");
    // muldiv overflows when prod1/denominotor > 1 in:
    // (prod1*2^256 + prod0) / denominator
    muldiv(
      115792089237316195423570985008687907853269984665640564039457_584007913129639935,
      115792089237316195423570985008687907853269984665640564039457_584007913129639935,
      1e18
    );
  }

  function testPowuWad() public {
    assertEq(powuWad(0, 0), 1e18);
    assertEq(powuWad(0, 1), 0);
    assertEq(powuWad(1e18, 0), 1e18);
    assertEq(powuWad(1e18, 1), 1e18);
    assertEq(powuWad(-1e18, 0), 1e18);
    assertEq(powuWad(-1e18, 1), -1e18);
    assertEq(powuWad(1e15, 2), 1e12);
    assertEq(powuWad(10e18, 2), 100e18);
    assertApproxEqRel(
      powuWad(5419e15, 19),
      // cross calculated using wolfram alpha
      87996190095091_496997815923266387,
      1000
    );
    assertApproxEqRel(
      powuWad(478770000000000000000, 20),
      // cross calculated using wolfram alpha
      400441047687151121501368529571950234763284476825512183_793320000000000000,
      1000
    );
    assertApproxEqRel(
      powuWad(6452166000000000000000, 7),
      // cross calculated using wolfram alpha
      465520409372619407422434167_862736844121311696,
      1000
    );

    int256 maxSD59x18SQRT = 240615969168004511545033772477_625056927114980741;
    assertApproxEqRel(
      powuWad(maxSD59x18SQRT, 2),
      int256(
        57896044618658097711785492504343953926634992332820282019728_000000000000000000
      ),
      1
    );

    int256 maxSD59x18SQRTNeg = -240615969168004511545033772477_625056927114980741;
    assertApproxEqRel(
      powuWad(maxSD59x18SQRTNeg, 2),
      int256(
        57896044618658097711785492504343953926634992332820282019728_000000000000000000
      ),
      1
    );

    int256 maxU60x18CBRT = 38685626227668133590_597631999999999999;
    assertApproxEqRel(
      powuWad(maxU60x18CBRT, 3),
      // cross calculated using wolfram alpha
      57896044618658097711785492504343953926634992332820282019728_000000000000000000,
      1
    );

    int256 maxSD59x18Whole = 57896044618658097711785492504343953926634992332820282019728;
    assertEq(
      powuWad(maxSD59x18Whole, 1),
      57896044618658097711785492504343953926634992332820282019728
    );
  }

  function testPowuWadBaseUnderflow() public {
    vm.expectRevert("powuWad:x cannot be min int256");
    powuWad(type(int256).min, 1);
  }

  function testPowuWadResultOverflow() public {
    vm.expectRevert("prod1 > denominator");
    powuWad(type(int256).max, type(uint256).max);
  }

  function testPowuWadFFI() public {
    // Cross Ref tests
    int256 x = 2;
    uint256 y = 3;
    int256 pyResult = abi.decode(
      ffi(
        "pow",
        string(abi.encodePacked(uint256(x).toString(), ",", y.toString()))
      ),
      (int256)
    );
    int256 solResult = powuWad(x * 1e18, y);
    assertApproxEqAbs(solResult, pyResult, 500);

    x = 10;
    y = 2;
    pyResult = abi.decode(
      ffi(
        "pow",
        string(abi.encodePacked(uint256(x).toString(), ",", y.toString()))
      ),
      (int256)
    );
    solResult = powuWad(x * 1e18, y);
    assertApproxEqAbs(solResult, pyResult, 500);
  }

  function testMostSignificantBit() public {
    assertEq(mostSignificantBit(10), 3);
    assertEq(mostSignificantBit(7), 2);
    assertEq(mostSignificantBit(2), 1);
    assertEq(mostSignificantBit(0), 0);
    assertEq(mostSignificantBit(0), 0);
    assertEq(mostSignificantBit(type(uint256).max), 255);
  }

  function testSignedMuldiv() public {
    assertEq(
      muldiv(type(int256).max, type(int256).max, type(int256).max),
      type(int256).max
    );
    assertEq(
      muldiv(type(int256).min + 1, type(int256).min + 1, type(int256).min + 1),
      type(int256).min + 1
    );
    assertEq(muldiv(0, -1e18, 1e18), 0);
    assertEq(muldiv(1e18, -1e18, 1e18), -1e18);
    assertEq(muldiv(2e18, -3e18, 1e18), -6e18);
    assertEq(muldiv(2e18, -3e18, -1e18), 6e18);
  }
}
