#### Contracts

This repo contains a collection of solidity contracts to experiment with different defi projects on EVM based chains. The contracts are compiled and tested using [hardhat](https://hardhat.org/) or Foundry. This repo also uses [typechain](https://github.com/dethcrypto/TypeChain) to generate Typescript types for the solidity contracts, which makes it convenient for writing tests and scripts in JS/TS. 

- [Simple Staking](https://github.com/avichalp/solidity-contracts/blob/master/contracts/StakingPool.sol) is a staking pool that allows users to deposit and withdraw ETH or native tokens of other EVM chains. It also allows an admin to add funds to this contract to distribute the rewards to incentivize the depositors. The rewards that an individual depositor receives are proportional to their deposited stake.

- The [Staking Token](https://github.com/avichalp/solidity-contracts/blob/master/contracts/StakingToken.sol) contract is similar to Simple Staking but also mints ERC20 tokens for the depositors. Later, the depositors can later redeem their sTokens for the native tokens they deposited plus the rewards accrued. 


- Implementation of fixed rate [Discrete](https://github.com/avichalp/solidity-contracts/blob/master/src/GDA/DiscreteGDA.sol) and [Continuous](https://github.com/avichalp/solidity-contracts/blob/master/src/GDA/ContGDA.sol) gradual dutch [auctions](https://www.paradigm.xyz/2022/04/gda). 



##### Usage

###### Run tests

```shell
npm run test
```

###### Generate Typescript types for the solidity contracts
```shell
npm run types

```

###### Foundry tests
```shell
forge test -vvvv

```


