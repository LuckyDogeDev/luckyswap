const { ChainId } = require("@luckyswap/sdk")


const GOLN = {
  [ChainId.MATIC]: '0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a'
}

module.exports = async function ({ ethers, deployments, getNamedAccounts }) {
  const { deploy } = deployments

  const { deployer, dev } = await getNamedAccounts()

  const chainId = await getChainId()

  let goldnuggetAddress;

  if (chainId === '31337') {
    goldnuggetAddress = (await deployments.get("GoldNugget")).address
  } else if (chainId in GOLN) {
    goldnuggetAddress = GOLN[chainId]
  } else {
    throw Error("No GOLN!")
  }

  await deploy("MiniMinerV2", {
    from: deployer,
    args: [goldnuggetAddress],
    log: true,
    deterministicDeployment: false
  })

  const miniMinerV2 = await ethers.getContract("MiniMinerV2")
  if (await miniMinerV2.owner() !== dev) {
    console.log("Transfer ownership of MiniMiner to dev")
    await (await miniMinerV2.transferOwnership(dev, true, false)).wait()
  }
}

module.exports.tags = ["MiniMinerV2"]
// module.exports.dependencies = ["UniswapV2Factory", "UniswapV2Router02"]
