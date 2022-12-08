#### Contracts

This repo contains a collection of solidity contracts to experiment with different projects on EVM based chains. 

The contracts are compiled and tested using [hardhat](https://hardhat.org/) or Foundry. This repo also uses [typechain](https://github.com/dethcrypto/TypeChain) to generate Typescript types for the solidity contracts, which makes it convenient for writing tests and scripts in JS/TS. 

1. [Simple Staking](https://github.com/avichalp/solidity-contracts/blob/master/contracts/StakingPool.sol) is a staking pool that allows users to deposit and withdraw ETH or native tokens of other EVM chains. It also allows an admin to add funds to this contract to distribute the rewards to incentivize the depositors. The rewards that an individual depositor receives are proportional to their deposited stake.

2. The [Staking Token](https://github.com/avichalp/solidity-contracts/blob/master/contracts/StakingToken.sol) contract is similar to Simple Staking but also mints ERC20 tokens for the depositors. Later, the depositors can later redeem their sTokens for the native tokens they deposited plus the rewards accrued. 


3. [Discrete](https://github.com/avichalp/solidity-contracts/blob/master/src/GDA/DiscreteGDA.sol) GDA is an implementation of fixed rate gradual dutch autuion for NFTs. It works by holding a [virtual](https://www.paradigm.xyz/2022/04/gda) Dutch auction for each token being sold. These auctions behave just like regular dutch auctions, with the ability for batches of auctions to be cleared efficiently. In a discrete GDA, every auction in a batch starts at the same time (T) but each successive (virtual) auction in a batch having a higher starting price. The price for every auction decays exponentially according to some decay function. 


4. [Continuous](https://github.com/avichalp/solidity-contracts/blob/master/src/GDA/ContGDA.sol) GDA contract is an implementation of fixed rate continuous dutch [auctions](https://www.paradigm.xyz/2022/04/gda). They work by imcrementally (at a fixed rate) minting new tokens. The emissions are broken into an infinite series of virtual auctions. If a user tries purchase more tokens than available according to the emission rate and the elapsed time the transaction reverts.

5. [Math Utils]() A collection of utilities including `muldiv`, `log2`, `ln`, `exp`, `pow` etc. It works on fixed point fractional numbers such 59x18 and 60x18 (i.e. last 18 digits are reserved for decimals). Implementations are inspired from various posts written on the topic by [Remco Bloemen](https://xn--2-umb.com/), [Mikhail Vladimirov](https://medium.com/coinmonks/math-in-solidity-part-1-numbers-384c8377f26d), [Alberto Cuesta Cañada](https://medium.com/cementdao/fixed-point-math-in-solidity-616f4508c6e8) and [Paul Razvan Berg](https://github.com/paulrberg/). These utilities are functional but not gas optimized yet.   
  



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
forge test -vvvv --ffi

```


