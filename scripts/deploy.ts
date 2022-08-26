import { ethers } from 'hardhat'

async function main() {
  // We get the contract to deploy
  const Pool = await ethers.getContractFactory('StakingPool');
  const stakingPool = await Pool.deploy();

  await stakingPool.deployed();

  console.log('StakingPool deployed to:', stakingPool.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
