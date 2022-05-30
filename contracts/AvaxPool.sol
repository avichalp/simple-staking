//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";


// state0: PreDepost: (mapping-> empty), (rewards-> 0)
// event0: Deposit
// state1: PostDeposit: (mapping -> not-empty), (rewards -> 0)


// state2: 
// assumption 1 : for simplicity, withdraw function withdraws all of the due amount (doesn't take aguments) 
// assumption 2 : the deployer (owner) must be a team member, only owner can Reward the rewards later



contract AvaxPool is Ownable, ReentrancyGuard {
    uint256 public unclaimedRewards; // S0

    mapping(address => uint256) public deposits; // S1
    address[] internal depositors;

    mapping(address => uint256) public rewards; // S1
    

    event Deposit(address indexed depositor, uint256 amount);
    event Reward(address indexed distributor, uint256 amount);
    event Withdraw(address indexed receiver, uint256 amount);
    

    /// @notice Accepts ETH/AVAX that grows over time
    /// @dev Accepts native token (ETH/AVAX) and adds it into the pool. Saves the sender address. 
    function deposit() public payable {
        console.log("in deposit :::: ", msg.sender);
        require(msg.value > 0, "No value deposited");

        deposits[msg.sender] += msg.value;        
        depositors.push(msg.sender);

        // initialize rewards will the deposit values
        // incase no more rewards accrues, rewards[msg.sender]
        // will be return on withdraw
        rewards[msg.sender] = deposits[msg.sender];

        emit Deposit(msg.sender, msg.value);
    }

    /// @notice Lets a user withdraws funds plus rewards (if any)
    /// @dev Explain to a developer any extra details
    /// @return amount msg.sender's balance plus rewards acrued
    function withdraw() public nonReentrant returns (uint256 amount) {
        // constraint 1: msg.sender must have enough balance
        // constraint 2: pool must have enough balance
        amount = rewards[msg.sender];

        require(deposits[msg.sender] > 0, "No deposit found");
        require(address(this).balance >= amount, "Pool out of liquidity");

        console.log("SENDER WITHDRAWING :::", amount);
        payable(msg.sender).transfer(amount); 
        
        deposits[msg.sender] = 0;
        rewards[msg.sender] = 0;
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
                console.log("CALCULATING REWARDS :::", calculateRewards(depositors[d]));
                rewards[depositors[d]] = calculateRewards(depositors[d]);
            }
        }        
    }

    /// @notice Explain to an end user what this does
    /// @dev Explain to a developer any extra details    
    function withdrawUnclaimedRewards() public onlyOwner nonReentrant {
        console.log("Claiming unclaimed rewards");
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
        depositorReward = numerator / denominator;                
    }

}