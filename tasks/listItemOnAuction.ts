import { task } from "hardhat/config";
import * as Configs from "../config"


task("listItemOnAuction", "List new NFT on the Market")
    .addParam("token", "Token address")
    .addParam("id", "Token Id")
    .addParam("price", "Owner address")
    .setAction(async  (taskArgs, { ethers }) => {

    const contract = await ethers.getContractAt("MarketPlace", taskArgs.token);

    await contract.listItemOnAuction(taskArgs.id, taskArgs.price);
});