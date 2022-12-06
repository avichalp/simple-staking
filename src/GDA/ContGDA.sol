//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import { ERC20 } from "solmate/tokens/ERC20.sol";
import "../Mathutil.sol";

//@notice Implementation of Continuous GDA with exponential price decay for ERC20
abstract contract ContGDA is ERC20 {
  ///@notice initialPrice (k) stored as 59x18 fixed precision number
  int256 internal immutable initialPrice;
  ///@notice decayConstant (λ) stored as 59x18 fixed precision number
  int256 internal immutable decayConstant;
  ///@notice lastAuctionTime (T): when the previous auction was started stored as 59x18 fixed precision number
  int256 internal lastAuctionTime;
  ///@notice emissionRate (r) stored as 59x18 fixed precision number
  int256 internal immutable emissionRate;

  error InsufficientPayment();
  error UnableToRefund();
  error InsufficientAvailableTokens();

  constructor(
    string memory _name,
    string memory _symbol,
    int256 _initialPrice,
    int256 _emissionRate,
    int256 _decayConstant
  ) ERC20(_name, _symbol, 18) {
    initialPrice = _initialPrice;
    emissionRate = _emissionRate;
    decayConstant = _decayConstant;
    lastAuctionTime = int256(block.timestamp * 1e18);
  }

  function purchasePrice(uint256 numTokensToBuy) public view returns (uint256) {
    int256 timeSinceLastAuctionStart = int256(block.timestamp * 1e18) -
      lastAuctionTime;

    int256 num1 = initialPrice;
    int256 num2 = expWad(
      muldiv(
        muldiv(decayConstant, int256(numTokensToBuy), 1e18),
        1e18,
        emissionRate
      )
    ) - 1e18;
    int256 den1 = decayConstant;
    int256 den2 = expWad(
      muldiv(decayConstant, timeSinceLastAuctionStart, 1e18)
    );

    int256 totalCost = muldiv(
      muldiv(num1, num2, 1e18),
      1e18,
      muldiv(den1, den2, 1e18)
    );
    return uint256(totalCost);
  }

  //@notice purchase a specific number of tokens from the GDA
  function purchaseTokens(uint256 numTokensToBuy, address to) public payable {
    int256 timeSinceLastAuction = int256(block.timestamp * 1e18) -
      lastAuctionTime;

    if (
      int256(numTokensToBuy) > muldiv(timeSinceLastAuction, emissionRate, 1e18)
    ) {
      revert InsufficientAvailableTokens();
    }

    uint256 cost = purchasePrice(numTokensToBuy);
    if (msg.value < cost) {
      revert InsufficientPayment();
    }

    //mint numTokensToBuy
    _mint(to, uint256(numTokensToBuy) / 1e18);
    // update last auction time
    lastAuctionTime = lastAuctionTime + timeSinceLastAuction;

    //refund extra payment
    uint256 refund = msg.value - cost;
    (bool sent, ) = msg.sender.call{ value: refund }("");
    if (!sent) {
      revert UnableToRefund();
    }
  }
}
