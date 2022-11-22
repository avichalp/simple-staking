// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract Math {
  function chineseRemainder(uint256 x0, uint256 x1)
    internal
    pure
    returns (uint256 r0, uint256 r1)
  {
    assembly {
      r0 := x0
      r1 := sub(sub(x1, x0), lt(x1, x0))
    }
  }

  function mul512(uint256 a, uint256 b)
    internal
    pure
    returns (uint256 r0, uint256 r1)
  {
    uint256 x0;
    unchecked {
      x0 = a * b; // (this is mod 2**256 by default)
    }
    uint256 x1 = mulmod(a, b, 2**256 - 1);
    (r0, r1) = chineseRemainder(x0, x1);
  }

  /// @notice Gives the highest power of 2 that divides the given uint
  /// @param a is a uint
  /// @return r is the highest power of 2 that divides the given number
  function twoDivisor(uint256 a) internal pure returns (uint256 r) {
    r = a & ~(a - 1);
  }

  function div256(uint256 a) internal pure returns (uint256 r) {
    require(a >= 1); // will return 0 when a == 1 due to overflow
    assembly {
      r := add(div(sub(0, a), a), 1)
    }
  }

  function mod256(uint256 a) internal pure returns (uint256 r) {
    assembly {
      r := mod(sub(0, a), a)
    }
  }

  function add512(
    uint256 a0,
    uint256 a1,
    uint256 b0,
    uint256 b1
  ) internal pure returns (uint256 r0, uint256 r1) {
    assembly {
      r0 := add(a0, b0)
      r1 := add(add(a1, b1), lt(r0, a0))
    }
  }

  function sub512(
    uint256 a0,
    uint256 a1,
    uint256 b0,
    uint256 b1
  ) internal pure returns (uint256 r0, uint256 r1) {
    assembly {
      r0 := sub(a0, b0)
      r1 := sub(sub(a1, b1), lt(a0, b0))
    }
  }

  /// @notice Divides a 512bit number with a 256bit number and retuers the quotient.
  /// @dev Dividend is broken into a0 and a1, two 256bit numbers.
  /// Similarly, return value is broken into x0 and x1.
  /// @param a0, a1, b a0*2^256 is the dividend and b is the divisor
  /// @return x0 and x1, the two components of quotient (x0*2^256 + x1)
  function div512(
    uint256 a0,
    uint256 a1,
    uint256 b
  ) internal pure returns (uint256 x0, uint256 x1) {
    uint256 q = div256(b);
    uint256 r = mod256(b);
    // original problem: (a1.2**256 + a0) / b
    // 2**256 = q.b + r, where q = div256(b) and r = mod256(b)
    //
    // reduce r at each iteration
    // ((a1.r + a0) / c) + a1.q
    while (a1 != 0) {
      // calculate a1.q
      (uint256 t0, uint256 t1) = mul512(a1, q);
      // add (a1.q) to the result
      (x0, x1) = add512(x0, x1, t0, t1);
      // calculate a1.r
      (t0, t1) = mul512(a1, r);
      // assign new a0, a1 for the next iteration
      (a0, a1) = add512(t0, t1, a0, 0);
    }
    (x0, x1) = add512(x0, x1, a0 / b, 0);
  }

  function inv256(uint256 a) internal pure returns (uint256 r) {
    // lookup table for r_2 = [r(2 - a.r1)]_2^2
    // The values values of r_2 where an inverse exists are
    // a∈1,3,5,…,15 with corresponding inverses [1,11,13,7,9,3,5,15]
    // 0x00 is used for missing values
    bytes16 table = 0x0001000b000d0007000900030005000f;
    bytes31 left = 0x00000000000000000000000000000000000000000000000000000000000000;
    bytes1 right = table[a % 16];
    r = uint256(bytes32(abi.encodePacked(left, right)));
    unchecked {
      r *= 2 - a * r;
      r *= 2 - a * r;
      r *= 2 - a * r;
      r *= 2 - a * r;
      r *= 2 - a * r;
      r *= 2 - a * r;
    }
    return r;
  }

  /// @notice Multiplies two 256 bits numbers with out overflowing
  /// then divides the result by the thrid number.
  /// @dev 1. Multiply the two 256bit inputs using mulmod and CRT to get a 512bit
  ///         number broken into two 256bit numbers: prod1*2^256 + prod0
  ///      2. Subtract the remainder of the division i.e. mulmod(a, b, denominator)
  ///      3. To calculate mod-inverse of dinominator the precondition must satisfy:
  ///         gcd(dinominator, 2^256) == 1. To ensure this, remove common "highest" power
  ///         of two from numerator (prod0) and dinominator.
  ///      4. The above step will make the product:
  ///         prod1*2^256 -> (prod1*2^256)/2^N and prod0 -> prod0/(2^N)
  ///      5. Since we have shifted prod0 by N bits, we can move these bits from prod1 to prod0
  ///      6. Finally take mod-inverse of (prod0, dinominator) % 2^256
  /// @param a, b, denominator are the inputs for: (a * b) / denominator
  /// @return result (256 bit number) = (a * b) / denominator.
  function muldiv(
    uint256 a,
    uint256 b,
    uint256 denominator
  ) internal pure returns (uint256 result) {
    require(denominator > 0);

    uint256 prod0;
    uint256 prod1;
    unchecked {
      (prod0, prod1) = mul512(a, b);
    }

    require(prod1 < denominator);

    uint256 inv;

    unchecked {
      uint256 remainder = mulmod(a, b, denominator);

      (prod0, prod1) = sub512(prod0, prod1, remainder, 0);

      uint256 twos = twoDivisor(denominator);
      denominator = denominator / twos;
      prod0 = prod0 / twos;

      twos = div256(twos);
      prod1 = prod1 * twos;
      prod0 = prod0 | prod1;

      inv = inv256(denominator);

      return prod0 * inv;
    }
  }

  function expWad(int256 x) internal pure returns (int256 r) {
    unchecked {
      // Ensure result doesn't underflow.
      // For any x smaller than threshold, return 0
      if (x <= -42139678854452767551) {
        return 0;
      }
      // Ensure result doesn't overflow.
      // For any x > threshold, revert
      if (x >= 135305999368893231589) {
        revert("EXP_OVERFLOW");
      }

      // x is of the form: a*10^-18. That is 18 digits
      // after the decimal point. Convert it to
      // the form a*2^-96 for higher precision in
      // intermediate calculations.
      // ==> x * 10**-18 => x * 5**-18 * 2**-18
      // ==> x * 5**-18 * 2**-18 * 2**78 * 2**-78
      // ==> (x * 5**-18 * 2**78) * 2**-78
      x = (x << 78) / (5**18);

      // To reduce the range of x to (-1/2*ln2, 1/2*ln2)*2**96,
      // factor out powers of 2.
      // => exp(x) = exp(x') * 2**K
      //
      // maximum power of two (K) that can be extracted from exp(x):
      // K = log_2(exp(x)) => round(ln(exp(x))/ln(2))
      // => round(x / ln(2))
      //
      // ln(2) = 0.693147180559945309, in WAD: 693147180559945309 * 10**-18
      // ln(2) = 54916777467707473351141471128 * (2**-96)
      //
      // Round by adding 1/2:
      // ((x * 2**96 / ln2 * 2**96) + 2**95) / 2**96
      int256 k = (((x << 96) / 54916777467707473351141471128) + 2**95) >> 96;

      // exp(x) = exp(x') * 2**K
      // => exp(x)*2**-K = exp(x')
      // => x' = x -Kln(2)
      x = x - (k * 54916777467707473351141471128);

      // using 6,7 term rational approximation
      int256 y = x + 1346386616545796478920950773328;
      y = ((y * x) >> 96) + 57155421227552351082224309758442;
      int256 p = y + x - 94201549194550492254356042504812;
      p = ((p * y) >> 96) + 28719021644029726153956944680412240;
      p = p * x + (4385272521454847904659076985693276 << 96);

      // We leave p in 2**192 basis so we don't need to scale it back up for the division.
      int256 q = x - 2855989394907223263936484059900;
      q = ((q * x) >> 96) + 50020603652535783019961831881945;
      q = ((q * x) >> 96) - 533845033583426703283633433725380;
      q = ((q * x) >> 96) + 3604857256930695427073651918091429;
      q = ((q * x) >> 96) - 14423608567350463180887372962807573;
      q = ((q * x) >> 96) + 26449188498355588339934803723976023;

      assembly {
        // Div in assembly because solidity adds a zero check despite the unchecked.
        // The q polynomial won't have zeros in the domain as all its roots are complex.
        // No scaling is necessary because p is already 2**96 too large.
        r := sdiv(p, q)
      }

      // r should be in the range (0.09, 0.25) * 2**96.

      // We now need to multiply r by:
      // * the scale factor s = ~6.031367120.
      // * the 2**k factor from the range reduction.
      // * the 1e18 / 2**96 factor for base conversion.
      // We do this all at once, with an intermediate result in 2**213
      // basis, so the final right shift is always by a positive amount.
      r = int256(
        (uint256(r) * 3822833074963236453042738258902158003155416615667) >>
          uint256(195 - k)
      );
    }
  }

  function log2Unoptimized(uint256 x) internal pure returns (uint256 r) {
    while (x > 1) {
      x = x >> 1;
      ++r;
    }
  }

  function log2(uint256 x) internal pure returns (uint256 r) {
    assembly {
      r := shl(7, lt(0xffffffffffffffffffffffffffffffff, x))
      r := or(r, shl(6, lt(0xffffffffffffffff, shr(r, x))))
      r := or(r, shl(5, lt(0xffffffff, shr(r, x))))

      // For the remaining 32 bits, use a De Bruijn lookup.
      x := shr(r, x)
      x := or(x, shr(1, x))
      x := or(x, shr(2, x))
      x := or(x, shr(4, x))
      x := or(x, shr(8, x))
      x := or(x, shr(16, x))
      r := or(
        r,
        byte(
          shr(251, mul(x, shl(224, 0x07c4acdd))),
          0x0009010a0d15021d0b0e10121619031e080c141c0f111807131b17061a05041f
        )
      )
    }
  }

  function lnWad(int256 x) internal pure returns (int256 r) {
    unchecked {
      require(x > 0, "UNDEFINED");

      // We want to convert x from 10**18 fixed point to 2**96 fixed point.
      // We do this by multiplying by 2**96 / 10**18. But since
      // ln(x * C) = ln(x) + ln(C), we can simply do nothing here
      // and add ln(2**96 / 10**18) at the end.

      // Reduce range of x to (1, 2) * 2**96
      // ln(2^k * x) = k * ln(2) + ln(x)
      int256 k = int256(log2(uint256(x))) - 96;
      x <<= uint256(159 - k);
      x = int256(uint256(x) >> 159);

      // Evaluate using a (8, 8)-term rational approximation.
      // p is made monic, we will multiply by a scale factor later.
      int256 p = x + 3273285459638523848632254066296;
      p = ((p * x) >> 96) + 24828157081833163892658089445524;
      p = ((p * x) >> 96) + 43456485725739037958740375743393;
      p = ((p * x) >> 96) - 11111509109440967052023855526967;
      p = ((p * x) >> 96) - 45023709667254063763336534515857;
      p = ((p * x) >> 96) - 14706773417378608786704636184526;
      p = p * x - (795164235651350426258249787498 << 96);

      // We leave p in 2**192 basis so we don't need to scale it back up for the division.
      // q is monic by convention.
      int256 q = x + 5573035233440673466300451813936;
      q = ((q * x) >> 96) + 71694874799317883764090561454958;
      q = ((q * x) >> 96) + 283447036172924575727196451306956;
      q = ((q * x) >> 96) + 401686690394027663651624208769553;
      q = ((q * x) >> 96) + 204048457590392012362485061816622;
      q = ((q * x) >> 96) + 31853899698501571402653359427138;
      q = ((q * x) >> 96) + 909429971244387300277376558375;
      assembly {
        // Div in assembly because solidity adds a zero check despite the unchecked.
        // The q polynomial is known not to have zeros in the domain.
        // No scaling required because p is already 2**96 too large.
        r := sdiv(p, q)
      }

      // r is in the range (0, 0.125) * 2**96

      // Finalization, we need to:
      // * multiply by the scale factor s = 5.549…
      // * add ln(2**96 / 10**18)
      // * add k * ln(2)
      // * multiply by 10**18 / 2**96 = 5**18 >> 78

      // mul s * 5e18 * 2**96, base is now 5**18 * 2**192
      r *= 1677202110996718588342820967067443963516166;
      // add ln(2) * k * 5e18 * 2**192
      r +=
        16597577552685614221487285958193947469193820559219878177908093499208371 *
        k;
      // add ln(2**96 / 10**18) * 5e18 * 2**192
      r += 600920179829731861736702779321621459595472258049074101567377883020018308;
      // base conversion: mul 2**18 / 2**192
      r >>= 174;
    }
  }
}
