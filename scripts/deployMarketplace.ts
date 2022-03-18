import { ethers } from "hardhat";

import * as Configs from "../config"

async function main() {

  const Marketplace = await ethers.getContractFactory("MarketPlace");
  const marketplace = await Marketplace.deploy
  (
    Configs.nftContract,
    Configs.erc20Contract
  );

  await marketplace.deployed();

  console.log("ERC721 deployed to:", marketplace.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
