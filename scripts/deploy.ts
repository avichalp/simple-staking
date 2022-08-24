import { ethers } from 'hardhat'

async function main() {
  // We get the contract to deploy
  const AvaxPool = await ethers.getContractFactory('AvaxPool');
  const avaxPool = await AvaxPool.deploy();

  await avaxPool.deployed();

  console.log('AvaxPool deployed to:', avaxPool.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
