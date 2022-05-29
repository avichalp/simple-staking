const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AVAXPool", function () {
  let users; 
  let userA, userB, team;
  let tx;
  let AvaxPool;
  let avaxPool;

  describe("With one user and team", function() {
    beforeEach(async function() {
      console.log("BEFORE ONE USER")      
      users = await ethers.getSigners();
      [team, userA] = users;            
      AvaxPool = await ethers.getContractFactory("AvaxPool");
      avaxPool = await AvaxPool.connect(team).deploy();
      await avaxPool.deployed();
    });

    it("team deposits before any user deposits", async function () {   
      // No increase in rewards
      await avaxPool.connect(team).reward(
        {value: ethers.utils.parseEther('1')}
      );
      let unclaimedRewards = await avaxPool.connect(team).unclaimedRewards();
      const userABalance = await avaxPool.deposits(userA.address);
      const userARewards = await avaxPool.rewards(userA.address);
            
      expect(unclaimedRewards).to.be.eq(ethers.utils.parseEther('1'));
      expect(userABalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userARewards).to.be.eq(ethers.BigNumber.from(0));
      
      // team could reclaim unclaim rewards back
      await avaxPool.connect(team).withdrawUnclaimedRewards();
      unclaimedRewards = await avaxPool.connect(team).unclaimedRewards();
      expect(unclaimedRewards).to.be.eq(ethers.utils.parseEther('0'));

    });
  
    it("team deposits after user A deposits", async function () {                
      let userABalance = await avaxPool.deposits(userA.address);
      let userARewards = await avaxPool.rewards(userA.address);      
      expect(userABalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userARewards).to.be.eq(ethers.BigNumber.from(0));

      await avaxPool.connect(userA).deposit(
        {value: ethers.utils.parseEther('1')}
      );
    
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('1'));

      await avaxPool.connect(team).reward(
        {value: ethers.utils.parseEther('1')}
      );
      // UserA's rewards should increase to 2 
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('2'));      
    });
  
    it("A tries to withdraw before depositing", async function () {       
      await expect(avaxPool.connect(userA).withdraw()).to.be.revertedWith('No deposit found');
    });
  
    it("A tries to deposit 0 value", async function () {       
      await expect(avaxPool.connect(userA).deposit()).to.be.revertedWith('No value deposited');
    });
  
    it("A deposits then withdraws before team deposits", async function () {       
      let userABalance = await avaxPool.deposits(userA.address);
      let userARewards = await avaxPool.rewards(userA.address);     
      let userAEthBalanceBefore = await userA.getBalance('latest');      
      expect(userABalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userARewards).to.be.eq(ethers.BigNumber.from(0));

      await avaxPool.connect(userA).deposit(
        {value: ethers.utils.parseEther('1')}
      );
    
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('1'));

      await avaxPool.connect(userA).withdraw();
      // UserA's rewards should increase to 2 
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      let userAEthBalanceAfter = await userA.getBalance('latest');
      expect(userABalance).to.be.eq(ethers.utils.parseEther('0'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('0'));
      
      console.log(`BEFORE ::: ${userAEthBalanceBefore} // AFTER ::: ${userAEthBalanceAfter}`);
      expect(userAEthBalanceBefore).to.be.gte(userAEthBalanceAfter);
      
    });
  
    it("A withdraw after team deposits", async function () {
    });
  
    it("A deposits then team deposits then A withdraws", async function () {
    });
  
    it("A tries to call reward function", async function () {
    });
  });
  
  
  describe("With two users and team", function() {
    beforeEach(async function() {
      console.log("BEFORE Two USER")
      users = await ethers.getSigners();            
      [team, userA, userB] = users;                  
      AvaxPool = await ethers.getContractFactory("AvaxPool");
      avaxPool = await AvaxPool.connect(team).deploy();
      await avaxPool.deployed();
    });

    it("A deposits, B deposits same as A, team deposits, A withdraws, B withdraws", async function () {
    });
  
    it("A deposits, B deposits same as A, team deposits, B withdraws, A withdraws", async function () {
    });
  
    it("A deposits, B deposits more than A, team deposits, A withdraws, B withdraws", async function () {
    });
  
    it("A deposits, B deposits more than A, team deposits, B withdraws, A withdraws", async function () {
    });
  
    it("A deposits, B deposits less than A, team deposits, A withdraws, B withdraws", async function () {
    });
  
    it("A deposits, B deposits less than A, team deposits, B withdraws, A withdraws", async function () {
    });
  
    it("A deposits, team deposits, B deposits, A withdraws, B withdraws", async function () {
    });
  
    it("A deposits, team deposits, B deposits, B withdraws, A withdraws", async function () {
    });
  });

  

});
