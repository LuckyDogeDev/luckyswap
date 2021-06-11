const { WETH } = require("@luckyfinance/sdk")

module.exports = async function ({ ethers: { getNamedSigner }, getNamedAccounts, deployments }) {
  const { deploy } = deployments

  const { deployer, dev } = await getNamedAccounts()

  const chainId = await getChainId()

  const factory = await ethers.getContract("UniswapV2Factory")
  const alchemybench = await ethers.getContract("AlchemyBench")
  const goldnugget = await ethers.getContract("GoldNugget")

  let wethAddress;

  if (chainId === '31337') {
    wethAddress = (await deployments.get("WETH9Mock")).address
  } else if (chainId in WETH) {
    wethAddress = WETH[chainId].address
  } else {
    throw Error("No WETH!")
  }

  await deploy("Smelter", {
    from: deployer,
    args: [factory.address, alchemybench.address, goldnugget.address, wethAddress],
    log: true,
    deterministicDeployment: false
  })

  const smelter = await ethers.getContract("Smelter")
  if (await smelter.owner() !== dev) {
    console.log("Setting smelter owner")
    await (await smelter.transferOwnership(dev, true, false)).wait()
  }
}

module.exports.tags = ["Smelter"]
module.exports.dependencies = ["UniswapV2Factory", "UniswapV2Router02", "AlchemyBench", "GoldNugget"]
