// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../../src/Math.sol";

contract MathTest is Test, Math {
  function testmul512() public {
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

  function testmul512(uint256 a, uint256 b) public {
    vm.assume(b > 1);
    (uint256 r0, uint256 r1) = mul512(a, b);
    (uint256 r2, uint256 r3) = div512(r0, r1, b);
    assertEq(r2, a);
    assertEq(r3, 0);
  }

  function testdiv512() public {
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
    (r0, r1) = Math.div512(a0, a1, b);
    assertEq(r0, 2);
    assertEq(r1, 0);
  }

  function testsub512(
    uint256 a0,
    uint256 a1,
    uint256 b0,
    uint256 b1
  ) public {
    (uint256 r0, uint256 r1) = Math.sub512(a0, a1, b0, b1);
    unchecked {
      assertEq(r0 + b0, a0);
      if (b0 > a0) {
        assertEq(r1 + b1 + 1, a1);
      } else {
        assertEq(r1 + b1, a1);
      }
    }
  }

  function testadd512(
    uint256 a0,
    uint256 a1,
    uint256 b0,
    uint256 b1
  ) public {
    (uint256 r0, uint256 r1) = Math.add512(a0, a1, b0, b1);
    unchecked {
      assertEq(b0, r0 - a0);
      if (r0 < a0) {
        assertEq(b1, r1 - a1 - 1);
      } else {
        assertEq(b1, r1 - a1);
      }
    }
  }

  function testinv256(uint256 a) public {
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

  function testtwoDivisors(uint256 a) public {
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

  function testdiv256() public {
    assertEq(div256(2), 2**255);
    assertEq(div256(4), 2**254);
    assertEq(div256(1), 0);
  }

  function testmod256() public {
    assertEq(mod256(2), 0);
    assertEq(mod256(type(uint256).max), 1);
  }

  function testexpWadLowerBound() public {
    assertEq(expWad(-43e18), 0);
  }

  function testexpWadOverflow() public {
    vm.expectRevert("EXP_OVERFLOW");
    expWad(136e18);
  }

  function testexpWad() public {
    assertEq(expWad(1e18), 2718281828459045235);
    assertEq(expWad(0e18), 1e18);
    assertEq(expWad(2e18), 7389056098930650227);
    assertEq(expWad(2718281828459045235), 15154262241479264184); // e^e
  }

  function testlog2() public {
    assertEq(log2(0), 0);
    assertEq(log2(1), 0);
    assertEq(log2(9), 3);
    assertEq(log2(256), 8);
    assertEq(log2(type(uint256).max), 255);
  }

  function testlog2Unoptimized() public {
    assertEq(log2Unoptimized(0), 0);
    assertEq(log2Unoptimized(1), 0);
    assertEq(log2Unoptimized(9), 3);
    assertEq(log2Unoptimized(256), 8);
    assertEq(log2Unoptimized(type(uint256).max), 255);
  }

  function testlnWad() public {
    //console.logInt(expWad(1e18));
    // console.logInt(lnWad(expWad(1e18)));
  }
}
