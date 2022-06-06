const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('AVAXPool', function () {
  let users;
  let userA, userB, team;
  let tx;
  let AvaxPool;
  let avaxPool;

  describe('With one user and team', function () {
    beforeEach(async function () {
      users = await ethers.getSigners();
      [team, userA] = users;
      await ethers.provider.send('hardhat_setBalance', [
        userA.address,
        '0x4563918244F40000', // 5 ETH
      ]);
      AvaxPool = await ethers.getContractFactory('AvaxPool');
      avaxPool = await AvaxPool.connect(team).deploy();
      await avaxPool.deployed();
    });

    it('team deposits before any user deposits', async function () {
      // No increase in rewards
      await avaxPool.connect(team).reward({ value: ethers.utils.parseEther('1') });
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

    it('team deposits after user A deposits', async function () {
      let userABalance = await avaxPool.deposits(userA.address);
      let userARewards = await avaxPool.rewards(userA.address);
      expect(userABalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userARewards).to.be.eq(ethers.BigNumber.from(0));

      // A deposits
      await avaxPool.connect(userA).deposit({ value: ethers.utils.parseEther('1') });
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('0'));

      await avaxPool.connect(team).reward({ value: ethers.utils.parseEther('1') });

      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('1'));
    });

    it('A tries to withdraw before depositing', async function () {
      const withdrawAmount = ethers.utils.parseEther('1');
      await expect(avaxPool.connect(userA).withdraw(withdrawAmount)).to.be.revertedWith(
        'No deposits found'
      );
    });

    it('A tries to deposit 0 value', async function () {
      await expect(avaxPool.connect(userA).deposit()).to.be.revertedWith(
        'Zero deposit is not allowed'
      );
    });

    it('A deposits then withdraws before team deposits', async function () {
      let userABalance = await avaxPool.deposits(userA.address);
      let userARewards = await avaxPool.rewards(userA.address);
      let userAEthBalanceBefore = await userA.getBalance('latest');
      expect(userABalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userARewards).to.be.eq(ethers.BigNumber.from(0));

      // A deposits
      await avaxPool.connect(userA).deposit({ value: ethers.utils.parseEther('1') });
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('0'));

      const withdrawAmount = ethers.utils.parseEther('1');
      await avaxPool.connect(userA).withdraw(withdrawAmount);
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      let userAEthBalanceAfter = await userA.getBalance('latest');
      expect(userABalance).to.be.eq(ethers.utils.parseEther('0'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('0'));
      console.log(`BEFORE ::: ${userAEthBalanceBefore} // AFTER ::: ${userAEthBalanceAfter}`);
      expect(userAEthBalanceBefore).to.be.gte(userAEthBalanceAfter);
    });

    it('A deposits, team deposits, A withdraws', async function () {
      let userABalance = await avaxPool.deposits(userA.address);
      let userARewards = await avaxPool.rewards(userA.address);
      let userAEthBalanceBefore = await userA.getBalance('latest');
      expect(userABalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userARewards).to.be.eq(ethers.BigNumber.from(0));

      // A deposits
      await avaxPool.connect(userA).deposit({ value: ethers.utils.parseEther('1') });
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('0'));

      // Team deposits
      await avaxPool.connect(team).reward({ value: ethers.utils.parseEther('1') });
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('1'));

      const withdrawAmount = ethers.utils.parseEther('2');
      await avaxPool.connect(userA).withdraw(withdrawAmount);
      // UserA's rewards should increase to 2
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      let userAEthBalanceAfter = await userA.getBalance('latest');
      expect(userABalance).to.be.eq(ethers.utils.parseEther('0'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('0'));
      console.log(`BEFORE ::: ${userAEthBalanceBefore} // AFTER ::: ${userAEthBalanceAfter}`);
      expect(userAEthBalanceAfter).to.be.gte(userAEthBalanceBefore);
    });

    it('A deposits, team deposits, A partially withdraws, team deposits, A withdraws', async function () {
      let userABalance = await avaxPool.deposits(userA.address);
      let userARewards = await avaxPool.rewards(userA.address);
      let userAEthBalanceBefore = await userA.getBalance('latest');
      expect(userABalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userARewards).to.be.eq(ethers.BigNumber.from(0));

      // A depostis
      await avaxPool.connect(userA).deposit({ value: ethers.utils.parseEther('1') });
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('0'));

      // Team depostis
      await avaxPool.connect(team).reward({ value: ethers.utils.parseEther('1') });
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('1'));

      // A partially Withdraws (1 ETH, Available rewards: 2 ETH)
      const withdrawAmount = ethers.utils.parseEther('1');
      await avaxPool.connect(userA).withdraw(withdrawAmount);
      // UserA's rewards should increase to 2
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      let userAEthBalanceAfter = await userA.getBalance('latest');
      // A withdraws ALL of their deposits (1 ETH)
      // still 1 ETH left in rewards, because of the team deposit
      expect(userABalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('0'));
      console.log(`BEFORE ::: ${userAEthBalanceBefore} // AFTER ::: ${userAEthBalanceAfter}`);
      // A Deposits 1 ETH, Withdraws 1 ETH minus Gas for both transactions
      expect(userAEthBalanceAfter).to.be.lte(userAEthBalanceBefore);

      // Team deposits
      await avaxPool.connect(team).reward({ value: ethers.utils.parseEther('1') });
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('1'));

      // A withdraws
      const withdrawAmount2 = ethers.utils.parseEther('2');
      await avaxPool.connect(userA).withdraw(withdrawAmount2);
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      userAEthBalanceAfter = await userA.getBalance('latest');
      expect(userABalance).to.be.eq(ethers.utils.parseEther('0'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('0'));
      console.log(`BEFORE ::: ${userAEthBalanceBefore} // AFTER ::: ${userAEthBalanceAfter}`);
      expect(userAEthBalanceAfter).to.be.gte(userAEthBalanceBefore);
    });

    it('A tries to call reward function', async function () {
      await expect(avaxPool.connect(userA).reward()).to.be.revertedWith(
        'Ownable: caller is not the owner'
      );
    });
  });

  describe('With two users and team', function () {
    beforeEach(async function () {
      users = await ethers.getSigners();
      [team, userA, userB] = users;
      await ethers.provider.send('hardhat_setBalance', [
        userA.address,
        '0x4563918244F40000', // 5 ETH
      ]);
      await ethers.provider.send('hardhat_setBalance', [
        userB.address,
        '0x4563918244F40000', // 5 ETH
      ]);
      AvaxPool = await ethers.getContractFactory('AvaxPool');
      avaxPool = await AvaxPool.connect(team).deploy();
      await avaxPool.deployed();
    });

    it('A deposits, B deposits same as A, team deposits, A withdraws, B withdraws', async function () {
      let userABalance = await avaxPool.deposits(userA.address);
      let userARewards = await avaxPool.rewards(userA.address);
      let userBBalance = await avaxPool.deposits(userB.address);
      let userBRewards = await avaxPool.rewards(userB.address);
      expect(userABalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userARewards).to.be.eq(ethers.BigNumber.from(0));
      expect(userBBalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userBRewards).to.be.eq(ethers.BigNumber.from(0));

      // A deposits
      await avaxPool.connect(userA).deposit({ value: ethers.utils.parseEther('1') });
      let userAEthBalanceBefore = await userA.getBalance('latest');
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      userBBalance = await avaxPool.deposits(userB.address);
      userBRewards = await avaxPool.rewards(userB.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('0'));
      expect(userBBalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userBRewards).to.be.eq(ethers.BigNumber.from(0));

      // B deposits
      await avaxPool.connect(userB).deposit({ value: ethers.utils.parseEther('1') });
      let userBEthBalanceBefore = await userB.getBalance('latest');
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      userBBalance = await avaxPool.deposits(userB.address);
      userBRewards = await avaxPool.rewards(userB.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('0'));
      expect(userBBalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userBRewards).to.be.eq(ethers.utils.parseEther('0'));

      // Team deoposits
      await avaxPool.connect(team).reward({ value: ethers.utils.parseEther('2') });
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      userBBalance = await avaxPool.deposits(userB.address);
      userBRewards = await avaxPool.rewards(userB.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('1'));
      expect(userBBalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userBRewards).to.be.eq(ethers.utils.parseEther('1'));

      // A and B both have 50% share of the pool, they should accrue
      // same amount of rewards
      expect(userBRewards).to.be.eq(userARewards);

      // B withdraws
      const withdrawAmountB = ethers.utils.parseEther('2');
      await avaxPool.connect(userB).withdraw(withdrawAmountB);
      userBBalance = await avaxPool.deposits(userB.address);
      userBRewards = await avaxPool.rewards(userB.address);
      let userBEthBalanceAfter = await userB.getBalance('latest');
      expect(userBBalance).to.be.eq(ethers.utils.parseEther('0'));
      expect(userBRewards).to.be.eq(ethers.utils.parseEther('0'));
      console.log(`B BEFORE ::: ${userBEthBalanceBefore} // B AFTER ::: ${userBEthBalanceAfter}`);
      console.log(`B DIFF ::: ${userBEthBalanceAfter.sub(userBEthBalanceBefore)}`);
      expect(userBEthBalanceAfter).to.be.gte(userBEthBalanceBefore);

      // A withdraws
      const withdrawAmountA = ethers.utils.parseEther('2');
      await avaxPool.connect(userA).withdraw(withdrawAmountA);
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      let userAEthBalanceAfter = await userA.getBalance('latest');
      expect(userABalance).to.be.eq(ethers.utils.parseEther('0'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('0'));
      console.log(`A BEFORE ::: ${userAEthBalanceBefore} // A AFTER ::: ${userAEthBalanceAfter}`);
      console.log(`A DIFF ::: ${userAEthBalanceAfter.sub(userAEthBalanceBefore)}`);
      expect(userAEthBalanceAfter).to.be.gte(userAEthBalanceBefore);
    });

    it('A deposits, B deposits same as A, team deposits, B withdraws, A withdraws', async function () {
      let userABalance = await avaxPool.deposits(userA.address);
      let userARewards = await avaxPool.rewards(userA.address);
      let userBBalance = await avaxPool.deposits(userB.address);
      let userBRewards = await avaxPool.rewards(userB.address);
      expect(userABalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userARewards).to.be.eq(ethers.BigNumber.from(0));
      expect(userBBalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userBRewards).to.be.eq(ethers.BigNumber.from(0));

      // UserA deposits
      await avaxPool.connect(userA).deposit({ value: ethers.utils.parseEther('1') });
      let userAEthBalanceBefore = await userA.getBalance('latest');
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      userBBalance = await avaxPool.deposits(userB.address);
      userBRewards = await avaxPool.rewards(userB.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('0'));
      expect(userBBalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userBRewards).to.be.eq(ethers.BigNumber.from(0));

      // User B deposits
      await avaxPool.connect(userB).deposit({ value: ethers.utils.parseEther('1') });
      let userBEthBalanceBefore = await userB.getBalance('latest');
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      userBBalance = await avaxPool.deposits(userB.address);
      userBRewards = await avaxPool.rewards(userB.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('0'));
      expect(userBBalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userBRewards).to.be.eq(ethers.utils.parseEther('0'));

      // Team deposits
      await avaxPool.connect(team).reward({ value: ethers.utils.parseEther('2') });
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      userBBalance = await avaxPool.deposits(userB.address);
      userBRewards = await avaxPool.rewards(userB.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('1'));
      expect(userBBalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userBRewards).to.be.eq(ethers.utils.parseEther('1'));
      // A and B both have 50% share of the pool, they should accrue
      // same amount of rewards
      expect(userBRewards).to.be.eq(userARewards);

      // A withdraws
      const withdrawAmountA = ethers.utils.parseEther('2');
      await avaxPool.connect(userA).withdraw(withdrawAmountA);
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      let userAEthBalanceAfter = await userA.getBalance('latest');
      expect(userABalance).to.be.eq(ethers.utils.parseEther('0'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('0'));
      console.log(`A BEFORE ::: ${userAEthBalanceBefore} // A AFTER ::: ${userAEthBalanceAfter}`);
      console.log(`A DIFF ::: ${userAEthBalanceAfter.sub(userAEthBalanceBefore)}`);
      expect(userAEthBalanceAfter).to.be.gte(userAEthBalanceBefore);

      // B withdraws
      const withdrawAmountB = ethers.utils.parseEther('2');
      await avaxPool.connect(userB).withdraw(withdrawAmountB);
      userBBalance = await avaxPool.deposits(userB.address);
      userBRewards = await avaxPool.rewards(userB.address);
      let userBEthBalanceAfter = await userB.getBalance('latest');
      expect(userBBalance).to.be.eq(ethers.utils.parseEther('0'));
      expect(userBRewards).to.be.eq(ethers.utils.parseEther('0'));
      console.log(`B BEFORE ::: ${userBEthBalanceBefore} // B AFTER ::: ${userBEthBalanceAfter}`);
      console.log(`B DIFF ::: ${userBEthBalanceAfter.sub(userBEthBalanceBefore)}`);
      expect(userBEthBalanceAfter).to.be.gte(userBEthBalanceBefore);
    });

    it('A deposits, B deposits more than A, team deposits, A withdraws, B withdraws', async function () {
      let userABalance = await avaxPool.deposits(userA.address);
      let userARewards = await avaxPool.rewards(userA.address);
      let userBBalance = await avaxPool.deposits(userB.address);
      let userBRewards = await avaxPool.rewards(userB.address);
      expect(userABalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userARewards).to.be.eq(ethers.BigNumber.from(0));
      expect(userBBalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userBRewards).to.be.eq(ethers.BigNumber.from(0));

      // UserA deposits
      await avaxPool.connect(userA).deposit({ value: ethers.utils.parseEther('1') });
      let userAEthBalanceBefore = await userA.getBalance('latest');
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      userBBalance = await avaxPool.deposits(userB.address);
      userBRewards = await avaxPool.rewards(userB.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('0'));
      expect(userBBalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userBRewards).to.be.eq(ethers.BigNumber.from(0));

      // User B deposits
      await avaxPool.connect(userB).deposit({ value: ethers.utils.parseEther('2') });
      let userBEthBalanceBefore = await userB.getBalance('latest');
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      userBBalance = await avaxPool.deposits(userB.address);
      userBRewards = await avaxPool.rewards(userB.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('0'));
      expect(userBBalance).to.be.eq(ethers.utils.parseEther('2'));
      expect(userBRewards).to.be.eq(ethers.utils.parseEther('0'));

      // Team deposits
      await avaxPool.connect(team).reward({ value: ethers.utils.parseEther('3') });
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      userBBalance = await avaxPool.deposits(userB.address);
      userBRewards = await avaxPool.rewards(userB.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('1'));
      expect(userBBalance).to.be.eq(ethers.utils.parseEther('2'));
      expect(userBRewards).to.be.eq(ethers.utils.parseEther('2'));

      // A should get 1/3 of the pool and B should get 2/3
      // A deposited 1, B deposited 2 and team deposited 3
      // on withdrawl, A will get 2, B will get 4
      expect(userBRewards).to.be.eq(userARewards.mul(2));

      // A withdraws
      const withdrawAmountA = ethers.utils.parseEther('2');
      await avaxPool.connect(userA).withdraw(withdrawAmountA);
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      let userAEthBalanceAfter = await userA.getBalance('latest');
      expect(userABalance).to.be.eq(ethers.utils.parseEther('0'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('0'));
      console.log(`A BEFORE ::: ${userAEthBalanceBefore} // A AFTER ::: ${userAEthBalanceAfter}`);
      console.log(`A DIFF ::: ${userAEthBalanceAfter.sub(userAEthBalanceBefore)}`);
      expect(userAEthBalanceAfter).to.be.gte(userAEthBalanceBefore);

      // B withdraws
      const withdrawAmountB = ethers.utils.parseEther('4');
      await avaxPool.connect(userB).withdraw(withdrawAmountB);
      userBBalance = await avaxPool.deposits(userB.address);
      userBRewards = await avaxPool.rewards(userB.address);
      let userBEthBalanceAfter = await userB.getBalance('latest');
      expect(userBBalance).to.be.eq(ethers.utils.parseEther('0'));
      expect(userBRewards).to.be.eq(ethers.utils.parseEther('0'));
      console.log(`B BEFORE ::: ${userBEthBalanceBefore} // B AFTER ::: ${userBEthBalanceAfter}`);
      console.log(`B DIFF ::: ${userBEthBalanceAfter.sub(userBEthBalanceBefore)}`);
      expect(userBEthBalanceAfter).to.be.gte(userBEthBalanceBefore);
    });

    it('A deposits, B deposits more than A, team deposits, B withdraws, A withdraws', async function () {
      let userABalance = await avaxPool.deposits(userA.address);
      let userARewards = await avaxPool.rewards(userA.address);
      let userBBalance = await avaxPool.deposits(userB.address);
      let userBRewards = await avaxPool.rewards(userB.address);
      expect(userABalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userARewards).to.be.eq(ethers.BigNumber.from(0));
      expect(userBBalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userBRewards).to.be.eq(ethers.BigNumber.from(0));

      // UserA deposits
      await avaxPool.connect(userA).deposit({ value: ethers.utils.parseEther('1') });
      let userAEthBalanceBefore = await userA.getBalance('latest');
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      userBBalance = await avaxPool.deposits(userB.address);
      userBRewards = await avaxPool.rewards(userB.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('0'));
      expect(userBBalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userBRewards).to.be.eq(ethers.BigNumber.from(0));

      // User B deposits
      await avaxPool.connect(userB).deposit({ value: ethers.utils.parseEther('2') });
      let userBEthBalanceBefore = await userB.getBalance('latest');
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      userBBalance = await avaxPool.deposits(userB.address);
      userBRewards = await avaxPool.rewards(userB.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('0'));
      expect(userBBalance).to.be.eq(ethers.utils.parseEther('2'));
      expect(userBRewards).to.be.eq(ethers.utils.parseEther('0'));

      // Team deposits
      await avaxPool.connect(team).reward({ value: ethers.utils.parseEther('3') });
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      userBBalance = await avaxPool.deposits(userB.address);
      userBRewards = await avaxPool.rewards(userB.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('1'));
      expect(userBBalance).to.be.eq(ethers.utils.parseEther('2'));
      expect(userBRewards).to.be.eq(ethers.utils.parseEther('2'));

      // A should get 1/3 of the pool and B should get 2/3
      // A deposited 1, B deposited 2 and team deposited 3
      // on withdrawl, A will get 2, B will get 4
      expect(userBRewards).to.be.eq(userARewards.mul(2));

      // B withdraws
      const withdrawAmountB = ethers.utils.parseEther('4');
      await avaxPool.connect(userB).withdraw(withdrawAmountB);
      userBBalance = await avaxPool.deposits(userB.address);
      userBRewards = await avaxPool.rewards(userB.address);
      let userBEthBalanceAfter = await userB.getBalance('latest');
      expect(userBBalance).to.be.eq(ethers.utils.parseEther('0'));
      expect(userBRewards).to.be.eq(ethers.utils.parseEther('0'));
      console.log(`B BEFORE ::: ${userBEthBalanceBefore} // B AFTER ::: ${userBEthBalanceAfter}`);
      console.log(`B DIFF ::: ${userBEthBalanceAfter.sub(userBEthBalanceBefore)}`);
      expect(userBEthBalanceAfter).to.be.gte(userBEthBalanceBefore);

      // A withdraws
      const withdrawAmountA = ethers.utils.parseEther('2');
      await avaxPool.connect(userA).withdraw(withdrawAmountA);
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      let userAEthBalanceAfter = await userA.getBalance('latest');
      expect(userABalance).to.be.eq(ethers.utils.parseEther('0'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('0'));
      console.log(`A BEFORE ::: ${userAEthBalanceBefore} // A AFTER ::: ${userAEthBalanceAfter}`);
      console.log(`A DIFF ::: ${userAEthBalanceAfter.sub(userAEthBalanceBefore)}`);
      expect(userAEthBalanceAfter).to.be.gte(userAEthBalanceBefore);
    });

    it('A deposits, B deposits less than A, team deposits, A withdraws, B withdraws', async function () {
      let userABalance = await avaxPool.deposits(userA.address);
      let userARewards = await avaxPool.rewards(userA.address);
      let userBBalance = await avaxPool.deposits(userB.address);
      let userBRewards = await avaxPool.rewards(userB.address);
      expect(userABalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userARewards).to.be.eq(ethers.BigNumber.from(0));
      expect(userBBalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userBRewards).to.be.eq(ethers.BigNumber.from(0));

      // UserA deposits
      await avaxPool.connect(userA).deposit({ value: ethers.utils.parseEther('2') });
      let userAEthBalanceBefore = await userA.getBalance('latest');
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      userBBalance = await avaxPool.deposits(userB.address);
      userBRewards = await avaxPool.rewards(userB.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('2'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('0'));
      expect(userBBalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userBRewards).to.be.eq(ethers.BigNumber.from(0));

      // User B deposits
      await avaxPool.connect(userB).deposit({ value: ethers.utils.parseEther('1') });
      let userBEthBalanceBefore = await userB.getBalance('latest');
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      userBBalance = await avaxPool.deposits(userB.address);
      userBRewards = await avaxPool.rewards(userB.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('2'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('0'));
      expect(userBBalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userBRewards).to.be.eq(ethers.utils.parseEther('0'));

      // Team deposits
      await avaxPool.connect(team).reward({ value: ethers.utils.parseEther('3') });
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      userBBalance = await avaxPool.deposits(userB.address);
      userBRewards = await avaxPool.rewards(userB.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('2'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('2'));
      expect(userBBalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userBRewards).to.be.eq(ethers.utils.parseEther('1'));

      // A should get 1/3 of the pool and B should get 2/3
      // A deposited 1, B deposited 2 and team deposited 3
      // on withdrawl, A will get 2, B will get 4
      expect(userBRewards.mul(2)).to.be.eq(userARewards);

      // A withdraws
      const withdrawAmountA = ethers.utils.parseEther('4');
      await avaxPool.connect(userA).withdraw(withdrawAmountA);
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      let userAEthBalanceAfter = await userA.getBalance('latest');
      expect(userABalance).to.be.eq(ethers.utils.parseEther('0'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('0'));
      console.log(`A BEFORE ::: ${userAEthBalanceBefore} // A AFTER ::: ${userAEthBalanceAfter}`);
      console.log(`A DIFF ::: ${userAEthBalanceAfter.sub(userAEthBalanceBefore)}`);
      expect(userAEthBalanceAfter).to.be.gte(userAEthBalanceBefore);

      // B withdraws
      const withdrawAmountB = ethers.utils.parseEther('2');
      await avaxPool.connect(userB).withdraw(withdrawAmountB);
      userBBalance = await avaxPool.deposits(userB.address);
      userBRewards = await avaxPool.rewards(userB.address);
      let userBEthBalanceAfter = await userB.getBalance('latest');
      expect(userBBalance).to.be.eq(ethers.utils.parseEther('0'));
      expect(userBRewards).to.be.eq(ethers.utils.parseEther('0'));
      console.log(`B BEFORE ::: ${userBEthBalanceBefore} // B AFTER ::: ${userBEthBalanceAfter}`);
      console.log(`B DIFF ::: ${userBEthBalanceAfter.sub(userBEthBalanceBefore)}`);
      expect(userBEthBalanceAfter).to.be.gte(userBEthBalanceBefore);
    });

    it('A deposits, B deposits less than A, team deposits, B withdraws, A withdraws', async function () {
      let userABalance = await avaxPool.deposits(userA.address);
      let userARewards = await avaxPool.rewards(userA.address);
      let userBBalance = await avaxPool.deposits(userB.address);
      let userBRewards = await avaxPool.rewards(userB.address);
      expect(userABalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userARewards).to.be.eq(ethers.BigNumber.from(0));
      expect(userBBalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userBRewards).to.be.eq(ethers.BigNumber.from(0));

      // UserA deposits
      await avaxPool.connect(userA).deposit({ value: ethers.utils.parseEther('2') });
      let userAEthBalanceBefore = await userA.getBalance('latest');
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      userBBalance = await avaxPool.deposits(userB.address);
      userBRewards = await avaxPool.rewards(userB.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('2'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('0'));
      expect(userBBalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userBRewards).to.be.eq(ethers.BigNumber.from(0));

      // User B deposits
      await avaxPool.connect(userB).deposit({ value: ethers.utils.parseEther('1') });
      let userBEthBalanceBefore = await userB.getBalance('latest');
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      userBBalance = await avaxPool.deposits(userB.address);
      userBRewards = await avaxPool.rewards(userB.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('2'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('0'));
      expect(userBBalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userBRewards).to.be.eq(ethers.utils.parseEther('0'));

      // Team deposits
      await avaxPool.connect(team).reward({ value: ethers.utils.parseEther('3') });
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      userBBalance = await avaxPool.deposits(userB.address);
      userBRewards = await avaxPool.rewards(userB.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('2'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('2'));
      expect(userBBalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userBRewards).to.be.eq(ethers.utils.parseEther('1'));

      // A should get 1/3 of the pool and B should get 2/3
      // A deposited 1, B deposited 2 and team deposited 3
      // on withdrawl, A will get 2, B will get 4
      expect(userBRewards.mul(2)).to.be.eq(userARewards);

      // B withdraws
      const withdrawAmountB = ethers.utils.parseEther('2');
      await avaxPool.connect(userB).withdraw(withdrawAmountB);
      userBBalance = await avaxPool.deposits(userB.address);
      userBRewards = await avaxPool.rewards(userB.address);
      let userBEthBalanceAfter = await userB.getBalance('latest');
      expect(userBBalance).to.be.eq(ethers.utils.parseEther('0'));
      expect(userBRewards).to.be.eq(ethers.utils.parseEther('0'));
      console.log(`B BEFORE ::: ${userBEthBalanceBefore} // B AFTER ::: ${userBEthBalanceAfter}`);
      console.log(`B DIFF ::: ${userBEthBalanceAfter.sub(userBEthBalanceBefore)}`);
      expect(userBEthBalanceAfter).to.be.gte(userBEthBalanceBefore);

      // A withdraws
      const withdrawAmountA = ethers.utils.parseEther('4');
      await avaxPool.connect(userA).withdraw(withdrawAmountA);
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      let userAEthBalanceAfter = await userA.getBalance('latest');
      expect(userABalance).to.be.eq(ethers.utils.parseEther('0'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('0'));
      console.log(`A BEFORE ::: ${userAEthBalanceBefore} // A AFTER ::: ${userAEthBalanceAfter}`);
      console.log(`A DIFF ::: ${userAEthBalanceAfter.sub(userAEthBalanceBefore)}`);
      expect(userAEthBalanceAfter).to.be.gte(userAEthBalanceBefore);
    });

    it('A deposits, team deposits, B deposits, A withdraws, B withdraws', async function () {
      let userABalance = await avaxPool.deposits(userA.address);
      let userARewards = await avaxPool.rewards(userA.address);
      let userBBalance = await avaxPool.deposits(userB.address);
      let userBRewards = await avaxPool.rewards(userB.address);
      expect(userABalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userARewards).to.be.eq(ethers.BigNumber.from(0));
      expect(userBBalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userBRewards).to.be.eq(ethers.BigNumber.from(0));

      // UserA deposits
      await avaxPool.connect(userA).deposit({ value: ethers.utils.parseEther('1') });
      // Check state after A deposits
      let userAEthBalanceBefore = await userA.getBalance('latest');
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      userBBalance = await avaxPool.deposits(userB.address);
      userBRewards = await avaxPool.rewards(userB.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('0'));
      expect(userBBalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userBRewards).to.be.eq(ethers.BigNumber.from(0));

      // Team deposits
      await avaxPool.connect(team).reward({ value: ethers.utils.parseEther('2') });
      // check state after Team deposits
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      userBBalance = await avaxPool.deposits(userB.address);
      userBRewards = await avaxPool.rewards(userB.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('2'));
      expect(userBBalance).to.be.eq(ethers.utils.parseEther('0'));
      expect(userBRewards).to.be.eq(ethers.utils.parseEther('0'));

      // User B deposits
      let userBEthBalanceBefore = await userB.getBalance('latest');
      await avaxPool.connect(userB).deposit({ value: ethers.utils.parseEther('1') });
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      userBBalance = await avaxPool.deposits(userB.address);
      userBRewards = await avaxPool.rewards(userB.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('1'));
      // A should get 100% of the pool since B didn't deposit yet
      expect(userARewards).to.be.eq(ethers.utils.parseEther('2'));
      expect(userBBalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userBRewards).to.be.eq(ethers.utils.parseEther('0'));

      // A withdraws
      const withdrawAmountA = ethers.utils.parseEther('3');
      await avaxPool.connect(userA).withdraw(withdrawAmountA);
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      let userAEthBalanceAfter = await userA.getBalance('latest');
      expect(userABalance).to.be.eq(ethers.utils.parseEther('0'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('0'));
      console.log(`A BEFORE ::: ${userAEthBalanceBefore} // A AFTER ::: ${userAEthBalanceAfter}`);
      console.log(`A DIFF ::: ${userAEthBalanceAfter.sub(userAEthBalanceBefore)}`);
      expect(userAEthBalanceAfter).to.be.gte(userAEthBalanceBefore);

      // B withdraws
      const withdrawAmountB = ethers.utils.parseEther('1');
      await avaxPool.connect(userB).withdraw(withdrawAmountB);
      userBBalance = await avaxPool.deposits(userB.address);
      userBRewards = await avaxPool.rewards(userB.address);
      let userBEthBalanceAfter = await userB.getBalance('latest');
      expect(userBBalance).to.be.eq(ethers.utils.parseEther('0'));
      expect(userBRewards).to.be.eq(ethers.utils.parseEther('0'));
      console.log(`B BEFORE ::: ${userBEthBalanceBefore} // B AFTER ::: ${userBEthBalanceAfter}`);
      console.log(`B DIFF ::: ${userBEthBalanceAfter.sub(userBEthBalanceBefore)}`);
      expect(userBEthBalanceAfter).to.be.lte(userBEthBalanceBefore);
    });

    it('A deposits, team deposits, B deposits, B withdraws, A withdraws', async function () {
      let userABalance = await avaxPool.deposits(userA.address);
      let userARewards = await avaxPool.rewards(userA.address);
      let userBBalance = await avaxPool.deposits(userB.address);
      let userBRewards = await avaxPool.rewards(userB.address);
      expect(userABalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userARewards).to.be.eq(ethers.BigNumber.from(0));
      expect(userBBalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userBRewards).to.be.eq(ethers.BigNumber.from(0));

      // UserA deposits
      let userAEthBalanceBefore = await userA.getBalance('latest');
      await avaxPool.connect(userA).deposit({ value: ethers.utils.parseEther('1') });
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      userBBalance = await avaxPool.deposits(userB.address);
      userBRewards = await avaxPool.rewards(userB.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('0'));
      expect(userBBalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userBRewards).to.be.eq(ethers.BigNumber.from(0));

      // Team deposits
      await avaxPool.connect(team).reward({ value: ethers.utils.parseEther('2') });
      // check state after Team deposits
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      userBBalance = await avaxPool.deposits(userB.address);
      userBRewards = await avaxPool.rewards(userB.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('2'));
      expect(userBBalance).to.be.eq(ethers.utils.parseEther('0'));
      expect(userBRewards).to.be.eq(ethers.utils.parseEther('0'));

      // User B deposits
      let userBEthBalanceBefore = await userB.getBalance('latest');
      await avaxPool.connect(userB).deposit({ value: ethers.utils.parseEther('1') });
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      userBBalance = await avaxPool.deposits(userB.address);
      userBRewards = await avaxPool.rewards(userB.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('1'));
      // A should get 100% of the pool since B deposited after the team
      expect(userARewards).to.be.eq(ethers.utils.parseEther('2'));
      expect(userBBalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userBRewards).to.be.eq(ethers.utils.parseEther('0'));

      // B withdraws
      // todo: revert if B withdraw more than 1
      const withdrawAmountB = ethers.utils.parseEther('1');
      await avaxPool.connect(userB).withdraw(withdrawAmountB);
      userBBalance = await avaxPool.deposits(userB.address);
      userBRewards = await avaxPool.rewards(userB.address);
      let userBEthBalanceAfter = await userB.getBalance('latest');
      expect(userBBalance).to.be.eq(ethers.utils.parseEther('0'));
      expect(userBRewards).to.be.eq(ethers.utils.parseEther('0'));
      console.log(`B BEFORE ::: ${userBEthBalanceBefore} // B AFTER ::: ${userBEthBalanceAfter}`);
      console.log(`B DIFF ::: ${userBEthBalanceAfter.sub(userBEthBalanceBefore)}`);
      expect(userBEthBalanceAfter).to.be.lte(userBEthBalanceBefore);

      // A withdraws
      const withdrawAmountA = ethers.utils.parseEther('3');
      await avaxPool.connect(userA).withdraw(withdrawAmountA);
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      let userAEthBalanceAfter = await userA.getBalance('latest');
      expect(userABalance).to.be.eq(ethers.utils.parseEther('0'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('0'));
      console.log(`A BEFORE ::: ${userAEthBalanceBefore} // A AFTER ::: ${userAEthBalanceAfter}`);
      console.log(`A DIFF ::: ${userAEthBalanceAfter.sub(userAEthBalanceBefore)}`);
      expect(userAEthBalanceAfter).to.be.gte(userAEthBalanceBefore);
    });

    it('A deposits, team deposits, B deposits, B tries to withdraw more, A withdraws', async function () {
      let userABalance = await avaxPool.deposits(userA.address);
      let userARewards = await avaxPool.rewards(userA.address);
      let userBBalance = await avaxPool.deposits(userB.address);
      let userBRewards = await avaxPool.rewards(userB.address);
      expect(userABalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userARewards).to.be.eq(ethers.BigNumber.from(0));
      expect(userBBalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userBRewards).to.be.eq(ethers.BigNumber.from(0));

      // UserA deposits
      let userAEthBalanceBefore = await userA.getBalance('latest');
      await avaxPool.connect(userA).deposit({ value: ethers.utils.parseEther('1') });
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      userBBalance = await avaxPool.deposits(userB.address);
      userBRewards = await avaxPool.rewards(userB.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('0'));
      expect(userBBalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userBRewards).to.be.eq(ethers.BigNumber.from(0));

      // Team deposits
      await avaxPool.connect(team).reward({ value: ethers.utils.parseEther('2') });
      // check state after Team deposits
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      userBBalance = await avaxPool.deposits(userB.address);
      userBRewards = await avaxPool.rewards(userB.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('2'));
      expect(userBBalance).to.be.eq(ethers.utils.parseEther('0'));
      expect(userBRewards).to.be.eq(ethers.utils.parseEther('0'));

      // User B deposits
      let userBEthBalanceBefore = await userB.getBalance('latest');
      await avaxPool.connect(userB).deposit({ value: ethers.utils.parseEther('1') });
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      userBBalance = await avaxPool.deposits(userB.address);
      userBRewards = await avaxPool.rewards(userB.address);
      expect(userABalance).to.be.eq(ethers.utils.parseEther('1'));
      // A should get 100% of the pool since B deposited after the team
      expect(userARewards).to.be.eq(ethers.utils.parseEther('2'));
      expect(userBBalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userBRewards).to.be.eq(ethers.utils.parseEther('0'));

      // B withdraws
      // todo: revert if B withdraw more than 1
      const withdrawAmountB = ethers.utils.parseEther('2');
      await expect(avaxPool.connect(userB).withdraw(withdrawAmountB)).to.be.revertedWith(
        'No rewards available'
      );
      userBBalance = await avaxPool.deposits(userB.address);
      userBRewards = await avaxPool.rewards(userB.address);
      let userBEthBalanceAfter = await userB.getBalance('latest');
      expect(userBBalance).to.be.eq(ethers.utils.parseEther('1'));
      expect(userBRewards).to.be.eq(ethers.utils.parseEther('0'));
      console.log(`B BEFORE ::: ${userBEthBalanceBefore} // B AFTER ::: ${userBEthBalanceAfter}`);
      console.log(`B DIFF ::: ${userBEthBalanceAfter.sub(userBEthBalanceBefore)}`);
      expect(userBEthBalanceAfter).to.be.lte(userBEthBalanceBefore);

      // A withdraws
      const withdrawAmountA = ethers.utils.parseEther('3');
      await avaxPool.connect(userA).withdraw(withdrawAmountA);
      userABalance = await avaxPool.deposits(userA.address);
      userARewards = await avaxPool.rewards(userA.address);
      let userAEthBalanceAfter = await userA.getBalance('latest');
      expect(userABalance).to.be.eq(ethers.utils.parseEther('0'));
      expect(userARewards).to.be.eq(ethers.utils.parseEther('0'));
      console.log(`A BEFORE ::: ${userAEthBalanceBefore} // A AFTER ::: ${userAEthBalanceAfter}`);
      console.log(`A DIFF ::: ${userAEthBalanceAfter.sub(userAEthBalanceBefore)}`);
      expect(userAEthBalanceAfter).to.be.gte(userAEthBalanceBefore);
    });
  });
});
