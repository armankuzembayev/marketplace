import { task } from "hardhat/config";
import * as Configs from "../config"


task("buyItem", "Buy Item from the Market")
    .addParam("token", "Token address")
    .addParam("id", "Token Id")
    .setAction(async  (taskArgs, { ethers }) => {

    const contract = await ethers.getContractAt("MarketPlace", taskArgs.token);
    
    await contract.buyItem(taskArgs.id);
});