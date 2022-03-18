import { task } from "hardhat/config";
import * as Configs from "../config"


task("makeBid", "Make bid on Auction")
    .addParam("token", "Token address")
    .addParam("id", "Token Id")
    .addParam("price", "Owner address")
    .setAction(async  (taskArgs, { ethers }) => {

    const contract = await ethers.getContractAt("MarketPlace", taskArgs.token);

    await contract.makeBid(taskArgs.id, taskArgs.price);
});