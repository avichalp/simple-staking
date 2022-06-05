//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";


contract AvaxPool is Ownable, ReentrancyGuard {
    uint256 public unclaimedRewards;

    mapping(address => uint256) public deposits;
    address[] internal depositors;

    mapping(address => uint256) public rewards;


    event Deposit(address indexed depositor, uint256 amount);
    event Reward(address indexed distributor, uint256 amount);
    event Withdraw(address indexed receiver, uint256 amount);


    /// @notice Accepts ETH/AVAX that grows over time
    /// @dev Accepts native token (ETH/AVAX) and adds it into the pool. Saves the sender address.
    function deposit() public payable {
        require(msg.value > 0, "Zero deposit is not allowed");

        deposits[msg.sender] += msg.value;
        depositors.push(msg.sender);
        emit Deposit(msg.sender, msg.value);
    }

    /// @notice Lets a user withdraws funds plus rewards (if any)
    /// @dev Explain to a developer any extra details
    /// @return amount msg.sender's balance plus rewards acrued
    function withdraw(uint256 amount) public nonReentrant returns (uint256)  {
        // check if sender is eligible for rewards
        require(deposits[msg.sender] > 0, "No deposits found");

        require(rewards[msg.sender] + deposits[msg.sender] >= amount, "No rewards available");
        require(address(this).balance >= amount, "Pool out of liquidity");

        // If the amount is valid, first make the transfer before doing the accounting
        payable(msg.sender).transfer(amount);

        if (rewards[msg.sender] >= amount) {
            // add leftover rewards to deposit to make them eligible
            // for next distribution
            deposits[msg.sender] += rewards[msg.sender] - amount;
        } else {
            // remove remaining from deposits
            deposits[msg.sender] -= amount - rewards[msg.sender];
        }
        rewards[msg.sender] = 0;

        // Remove from Depositor's Array
        if (deposits[msg.sender] <= 0) {
            uint256 d;
            uint256 depositorIdx;
            for (d = 0; d < depositors.length; d++) {
                if (depositors[d] == msg.sender) {
                    depositorIdx = d;
                    break;
                }
            }
            removeDepositor(depositorIdx);
        }

        return amount;
    }

    /// @notice Allows the 'team' to send rewards
    /// @dev Explain to a developer any extra details
    function reward() public payable onlyOwner {
        // team members are allowed to deposit and anytime
        // if they depoist before there are any depositors,
        // these funds will be locked up in `unclaimedRewards`
        // the 'team' can re-claim them later
        if (depositors.length == 0) {
            unclaimedRewards += msg.value;
        } else {
            // distribute rewards
            uint256 d;
            for (d = 0; d < depositors.length; d++) {
                rewards[depositors[d]] = calculateRewards(depositors[d]);
            }
        }
    }

    /// @notice Explain to an end user what this does
    /// @dev Explain to a developer any extra details
    function withdrawUnclaimedRewards() public onlyOwner nonReentrant {
        payable(msg.sender).transfer(unclaimedRewards);
        unclaimedRewards = 0;
    }

    /// @dev Explain to a developer any extra details
    /// @param index that is to be deleted
    function removeDepositor(uint index) private {
        require(index < depositors.length, "Invalid depositor index");
        depositors[index] = depositors[depositors.length-1];
        depositors.pop();
    }

    /// @dev based on current balance, determine the `msg.sender`'s
    /// share and returns the their rewards
    /// @param depositor address whose rewards are to be calculated
    /// @return depositorReward based on their share of liquidity
    function calculateRewards(address depositor) private view returns (uint256 depositorReward) {
        // msg.value will be included in the contract's balance
        uint256 depositorBalance = deposits[depositor];
        uint256 numerator = depositorBalance * (address(this).balance - unclaimedRewards);
        uint256 denominator = address(this).balance - msg.value - unclaimedRewards;
        // rewards minus original balance
        depositorReward = (numerator / denominator) - depositorBalance;

    }

}