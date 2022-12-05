//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import { ERC721 } from "solmate/tokens/ERC721.sol";
import "../Mathutil.sol";

//@notice Implementation of Discrete GDA with exponential price decay for ERC721
abstract contract DiscreteGDA is ERC721 {
  ///@notice id of current ERC721
  uint256 public currentId = 0;

  // stored as 59x18 fixed precision number
  // initialPrice (k)
  int256 internal immutable initialPrice;
  // scaleFactor (α)
  int256 internal immutable scaleFactor;
  // decayConstant (λ)
  int256 internal immutable decayConstant;
  // auctionStartTime (T)
  int256 internal immutable auctionStartTime;

  error InsufficientPayment();
  error UnableToRefund();

  constructor(
    string memory _name,
    string memory _symbol,
    int256 _initialPrice,
    int256 _scaleFactor,
    int256 _decayConstant
  ) ERC721(_name, _symbol) {
    initialPrice = _initialPrice;
    scaleFactor = _scaleFactor;
    decayConstant = _decayConstant;
    auctionStartTime = int256(block.timestamp * 1e18);
  }

  function purchasePrice(uint256 numTokensToBuy) public view returns (uint256) {
    int256 timeSinceStart = int256(block.timestamp * 1e18) - auctionStartTime;

    int256 num1 = muldiv(initialPrice, powuWad(scaleFactor, currentId), 1e18);

    int256 num2 = powuWad(scaleFactor, numTokensToBuy) - 1e18;

    int256 den1 = expWad(muldiv(decayConstant, timeSinceStart, 1e18));

    int256 den2 = scaleFactor - 1e18;

    int256 totalCost = muldiv(
      muldiv(num1, num2, 1e18),
      1e18,
      muldiv(den1, den2, 1e18)
    );

    return uint256(totalCost);
  }

  //@notice purchase a specific number of tokens from the GDA
  function purchaseTokens(uint256 numTokens, address to) public payable {
    uint256 cost = purchasePrice(numTokens);
    if (msg.value < cost) {
      revert InsufficientPayment();
    }

    //mint numTokens
    for (uint256 i = 0; i < numTokens; i++) {
      _mint(to, ++currentId);
    }

    //refund extra payment
    uint256 refund = msg.value - cost;
    (bool sent, ) = msg.sender.call{ value: refund }("");
    if (!sent) {
      revert UnableToRefund();
    }
  }
}
