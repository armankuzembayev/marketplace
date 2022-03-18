import { task } from "hardhat/config";
import * as Configs from "../config"


task("createItem", "Create new NFT Item")
    .addParam("token", "Token address")
    .addParam("uri", "Token URI")
    .addParam("owner", "Owner address")
    .setAction(async  (taskArgs, { ethers }) => {

    const contract = await ethers.getContractAt("MarketPlace", taskArgs.token);
    
    await contract.createItem(taskArgs.uri, taskArgs.owner);
});