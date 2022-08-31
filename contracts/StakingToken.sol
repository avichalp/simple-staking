//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract StakingToken is Ownable, ReentrancyGuard, ERC20 {
  event Deposit(address indexed depositor, uint256 amount);
  event Withdraw(address indexed receiver, uint256 amount);

  constructor() ERC20("sTOKEN", "sTOKEN") {}

  /// @notice Accepts native token like ETH/AVAX returns sToken tokens
  /// to the depositor.
  /// @dev Accepts native token (ETH/AVAX) and adds it into the contract.
  // Mints the equal amount of ERC20 tokens and transfer them to the
  // depositor. Later the depositor can redeem native tokens using their
  // sToken tokens
  function deposit() external payable {
    require(msg.value > 0, "Zero deposit is not allowed");

    // mints new sToken equal to the deposit value
    _mint(msg.sender, msg.value);

    emit Deposit(msg.sender, msg.value);
  }

  /// @notice receives native tokens only from th 'admin' for rewarding stakers
  /// @dev The admin can transfer some ETH to the contract which will be used
  /// to give rewards to the stakers. No reward calculation happens at this point
  /// only the ETH is transferd from Admin to Contract
  receive() external payable onlyOwner {}

  /// @notice Lets a user redeem native tokens for sToken tokens
  /// @return redeemed amount
  function withdraw(uint256 amount) external nonReentrant returns (uint256) {
    // Make sure that the contract is solvent
    require(address(this).balance >= amount, "Contract out of liquidity");

    uint256 maxAmount = maxWithdrawlAmount(msg.sender);

    // check if sender is eligible for rewards
    require(
      maxAmount >= amount,
      "Given amount is greater than available rewards"
    );

    // burn sender's stake before redeeming the underlying
    burn(msg.sender, amount);

    // redeem native token for sToken
    payable(msg.sender).transfer(amount);

    emit Withdraw(msg.sender, amount);

    return amount;
  }

  // internal functions

  /// @dev based on the shares of the staking pool held by the staker, calcualtes
  /// the reward. shares are (tokens held by the staker / total supply)
  /// @return the max available reward for the staker
  function maxWithdrawlAmount(address account) internal view returns (uint256) {
    uint256 numerator = (this.balanceOf(account) * address(this).balance);
    uint256 denominator = this.totalSupply();
    return numerator / denominator;
  }

  /// @dev this function calculates the burn amount and calls ERC20 _burn
  /// if the max available reward > sender's staked, burn the whole stake
  /// otherwise burn the withdraw amount
  function burn(address account, uint256 amount) internal {
    uint256 senderStake = this.balanceOf(account);
    uint256 burnAmount;

    if (amount >= senderStake) {
      burnAmount = senderStake;
    } else {
      burnAmount = amount;
    }

    _burn(account, burnAmount);
  }
}
