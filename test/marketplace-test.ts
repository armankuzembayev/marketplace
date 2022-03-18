const { expect } = require("chai");
const { ethers } = require("hardhat");

import * as Configs from "../config"

describe("Marketplace", function ()  {

    let Erc20Token: any;
    let erc20Token: any;
    let Erc721Token: any;
    let erc721Token: any;
    let Market: any;
    let market: any;

    let owner: any;
    let addr1: any;
    let addr2: any;
    let addr3: any;
    let zeroAddress = ethers.utils.getAddress(Configs.zeroAddress)


    beforeEach(async function() {
        [owner, addr1, addr2, addr3] = await ethers.getSigners();

        Erc20Token = await ethers.getContractFactory("Erc20");
        const nameErc20 = Configs.nameErc20;
        const symbolErc20 = Configs.symbolErc20;
        const decimals = Configs.decimals;
        const totalSupply = Configs.totalSupply;

        erc20Token = await Erc20Token.deploy(nameErc20, symbolErc20, decimals, ethers.utils.parseEther(totalSupply));
        await erc20Token.deployed();


        Market = await ethers.getContractFactory("MarketPlace");

        market = await Market.deploy(zeroAddress, erc20Token.address);
        await market.deployed();



        Erc721Token = await ethers.getContractFactory("Erc721");

        const nameErc721 = Configs.nameErc721;
        const symbolErc721 = Configs.symbolErc721;
        
        erc721Token = await Erc721Token.deploy(nameErc721, symbolErc721, market.address);
        await erc721Token.deployed();

        await market.setNftContract(erc721Token.address);

    });

    describe("Deployment", function() {

        it("Should initialize correctly", async function() {
            expect(await market.nftContract()).to.equal(erc721Token.address);
            expect(await market.erc20Contract()).to.equal(erc20Token.address);
            expect(await market.auctionPeriod()).to.equal(259200);

            expect(await erc721Token.currentIdx()).to.equal(0);
            expect(await erc721Token.marketplaceAddress()).to.equal(market.address);
        });
    });

    describe("Setters", function() {

        it("Should set correctly", async function() {
            await market.setErc20Contract(addr1.address);
            expect(await market.erc20Contract()).to.equal(addr1.address);

            await market.setAuctionPeriod(100);
            expect(await market.auctionPeriod()).to.equal(100);

            await erc721Token.setMarketplaceAddress(addr1.address);
            expect(await erc721Token.marketplaceAddress()).to.equal(addr1.address);

            expect(await erc721Token.supportsInterface(0xffffffff)).to.be.false;
            expect(await erc721Token.supportsInterface(0x80ac58cd)).to.be.true;
            expect(await erc721Token.supportsInterface(0x01ffc9a7)).to.be.true;

        });
    });

    describe("Create item", function() {

        it("Should revert", async function() {
            await expect(market.createItem("uri", zeroAddress)).to.be.revertedWith("Mint to zero address");
        });

        
        it("Should create item correctly", async function() {
            await market.createItem("uri", owner.address);
            
            expect(await erc721Token.ownerOf(1)).to.be.equal(owner.address);
        });
    });

    describe("List item", function() {

        it("Should revert", async function() {
            await expect(market.listItem(1, 1)).to.be.revertedWith("Token doesn't exist");
            await expect(market.listItem(0, 1)).to.be.revertedWith("Token id must be positive");

            await market.createItem("uri", addr1.address);
            await expect(market.listItem(1, 1)).to.be.revertedWith("Sender is not the owner");

            await expect(market.connect(addr1).listItem(1, 0)).to.be.revertedWith("Price should be positive");
        });

        
        it("Should list item correctly", async function() {
            await market.createItem("uri", owner.address);

            await market.listItem(1, ethers.utils.parseEther("1"));

            await expect(market.listItem(1, ethers.utils.parseEther("1"))).to.be.revertedWith("Sender is not the owner");

            const orders = await market.orders(1);
            
            expect(orders.owner).to.be.equal(owner.address);
            expect(orders.price).to.be.equal(ethers.utils.parseEther("1"));
            expect(orders.status).to.be.equal(1);

        });
    });

    describe("Cancel", function() {

        it("Should revert", async function() {
            await market.createItem("uri", owner.address);
            await expect(market.cancel(1)).to.be.revertedWith("Item is not on sale");

            await market.listItem(1, ethers.utils.parseEther("1"));
            await expect(market.connect(addr1).cancel(1)).to.be.revertedWith("Sender is not the owner");
        });

        
        it("Should cancel item correctly", async function() {
            await market.createItem("uri", owner.address);
            await market.listItem(1, ethers.utils.parseEther("1"));

            expect(await erc721Token.ownerOf(1)).to.be.equal(market.address);
            await market.cancel(1);
            expect(await erc721Token.ownerOf(1)).to.be.equal(owner.address);
        });
    });

    describe("Buy Item", function() {

        it("Should revert", async function() {
            await market.createItem("uri", owner.address);
            await expect(market.buyItem(1)).to.be.revertedWith("Item is not on sale");

            await market.listItem(1, ethers.utils.parseEther("1"));
            await expect(market.buyItem(1)).to.be.revertedWith("Buyer cannot be the owner");
        });

        
        it("Should be able to buy item correctly", async function() {
            await market.createItem("uri", owner.address);
            await market.listItem(1, ethers.utils.parseEther("1"));

            await erc20Token.mint(addr1.address, ethers.utils.parseEther("1000"));
            await erc20Token.connect(addr1).approve(market.address, ethers.utils.parseEther("1000"));

            expect(await erc721Token.ownerOf(1)).to.be.equal(market.address);
            await market.connect(addr1).buyItem(1);
            expect(await erc721Token.ownerOf(1)).to.be.equal(addr1.address);
        });
    });

    describe("List item on Auction", function() {

        it("Should revert", async function() {
            await expect(market.listItemOnAuction(1, 1)).to.be.revertedWith("Token doesn't exist");
            await expect(market.listItemOnAuction(0, 1)).to.be.revertedWith("Token id must be positive");

            await market.createItem("uri", addr1.address);
            await expect(market.listItemOnAuction(1, 1)).to.be.revertedWith("Sender is not the owner");

            await expect(market.connect(addr1).listItemOnAuction(1, 0)).to.be.revertedWith("Price should be positive");
        });

        
        it("Should list item on auction correctly", async function() {
            await market.createItem("uri", owner.address);

            await market.listItemOnAuction(1, ethers.utils.parseEther("1"));

            await expect(market.listItemOnAuction(1, ethers.utils.parseEther("1"))).to.be.revertedWith("Sender is not the owner");

            const orders = await market.orders(1);
            
            expect(orders.owner).to.be.equal(owner.address);
            expect(orders.price).to.be.equal(ethers.utils.parseEther("1"));
            expect(orders.status).to.be.equal(4);

        });
    });

    describe("Make Bid", function() {

        it("Should revert", async function() {
            await market.createItem("uri", owner.address);
            await expect(market.makeBid(1, ethers.utils.parseEther("2"))).to.be.revertedWith("Item is not on auction");


            await market.listItemOnAuction(1, ethers.utils.parseEther("1"));
            await expect(market.makeBid(1, ethers.utils.parseEther("0"))).to.be.revertedWith("Price should be positive");

            await expect(market.makeBid(1, ethers.utils.parseEther("0.8"))).to.be.revertedWith("Price is lower than final bid");
            
            await market.setAuctionPeriod(3);
            expect(await market.auctionPeriod()).to.equal(3);
            await new Promise(f => setTimeout(f, 4000));

            await expect(market.makeBid(1, ethers.utils.parseEther("2"))).to.be.revertedWith("Auction is finished");
            
        });

        
        it("Should be able to make bid", async function() {
            await market.createItem("uri", owner.address);
            await market.listItemOnAuction(1, ethers.utils.parseEther("1"));

            await erc20Token.mint(addr1.address, ethers.utils.parseEther("1000"));
            await erc20Token.connect(addr1).approve(market.address, ethers.utils.parseEther("1000"));

            expect(await erc721Token.ownerOf(1)).to.be.equal(market.address);
            await market.connect(addr1).makeBid(1, ethers.utils.parseEther("2"));
            expect(await erc721Token.ownerOf(1)).to.be.equal(market.address);
        });

        it("Should be able to make and win bid", async function() {
            await market.createItem("uri", owner.address);
            await market.listItemOnAuction(1, ethers.utils.parseEther("1"));

            await erc20Token.mint(addr1.address, ethers.utils.parseEther("1000"));
            await erc20Token.connect(addr1).approve(market.address, ethers.utils.parseEther("1000"));

            await erc20Token.mint(addr2.address, ethers.utils.parseEther("1000"));
            await erc20Token.connect(addr2).approve(market.address, ethers.utils.parseEther("1000"));

            await erc20Token.mint(addr3.address, ethers.utils.parseEther("1000"));
            await erc20Token.connect(addr3).approve(market.address, ethers.utils.parseEther("1000"));

            expect(await erc721Token.ownerOf(1)).to.be.equal(market.address);
            await market.connect(addr1).makeBid(1, ethers.utils.parseEther("2"));
            expect(await erc20Token.balanceOf(addr1.address)).to.be.equal(ethers.utils.parseEther("998"));
            expect(await erc20Token.balanceOf(addr2.address)).to.be.equal(ethers.utils.parseEther("1000"));
            expect(await erc20Token.balanceOf(addr3.address)).to.be.equal(ethers.utils.parseEther("1000"));
            expect(await erc721Token.ownerOf(1)).to.be.equal(market.address);

            await market.connect(addr2).makeBid(1, ethers.utils.parseEther("3"));
            expect(await erc20Token.balanceOf(addr1.address)).to.be.equal(ethers.utils.parseEther("1000"));
            expect(await erc20Token.balanceOf(addr2.address)).to.be.equal(ethers.utils.parseEther("997"));
            expect(await erc20Token.balanceOf(addr3.address)).to.be.equal(ethers.utils.parseEther("1000"));
            expect(await erc721Token.ownerOf(1)).to.be.equal(market.address);

            await market.connect(addr3).makeBid(1, ethers.utils.parseEther("4"));
            expect(await erc20Token.balanceOf(addr1.address)).to.be.equal(ethers.utils.parseEther("1000"));
            expect(await erc20Token.balanceOf(addr2.address)).to.be.equal(ethers.utils.parseEther("1000"));
            expect(await erc20Token.balanceOf(addr3.address)).to.be.equal(ethers.utils.parseEther("996"));
            expect(await erc721Token.ownerOf(1)).to.be.equal(market.address);

            await market.setAuctionPeriod(3);
            expect(await market.auctionPeriod()).to.equal(3);
            await new Promise(f => setTimeout(f, 4000));

            await market.finishAuction(1);

            expect(await erc20Token.balanceOf(owner.address)).to.be.equal(ethers.utils.parseEther("4"));
            expect(await erc20Token.balanceOf(addr1.address)).to.be.equal(ethers.utils.parseEther("1000"));
            expect(await erc20Token.balanceOf(addr2.address)).to.be.equal(ethers.utils.parseEther("1000"));
            expect(await erc20Token.balanceOf(addr3.address)).to.be.equal(ethers.utils.parseEther("996"));
            expect(await erc721Token.ownerOf(1)).to.be.equal(addr3.address);

        });
    });

    describe("Finish Auction", function() {

        it("Should revert", async function() {
            await market.createItem("uri", owner.address);
            await expect(market.finishAuction(1)).to.be.revertedWith("Item is not on sale");

            await market.listItemOnAuction(1, ethers.utils.parseEther("1"));
            await expect(market.connect(addr1).finishAuction(1)).to.be.revertedWith("Auction is not finished yet");
        });

        
        it("Should finish auction correctly", async function() {
            await market.createItem("uri", owner.address);
            await market.listItemOnAuction(1, ethers.utils.parseEther("1"));

            await erc20Token.mint(addr1.address, ethers.utils.parseEther("1000"));
            await erc20Token.connect(addr1).approve(market.address, ethers.utils.parseEther("1000"));

            await erc20Token.mint(addr2.address, ethers.utils.parseEther("1000"));
            await erc20Token.connect(addr2).approve(market.address, ethers.utils.parseEther("1000"));

            expect(await erc721Token.ownerOf(1)).to.be.equal(market.address);
            await market.connect(addr1).makeBid(1, ethers.utils.parseEther("2"));
            expect(await erc20Token.balanceOf(addr1.address)).to.be.equal(ethers.utils.parseEther("998"));
            expect(await erc20Token.balanceOf(addr2.address)).to.be.equal(ethers.utils.parseEther("1000"));
            expect(await erc721Token.ownerOf(1)).to.be.equal(market.address);

            await market.connect(addr2).makeBid(1, ethers.utils.parseEther("3"));
            expect(await erc20Token.balanceOf(addr1.address)).to.be.equal(ethers.utils.parseEther("1000"));
            expect(await erc20Token.balanceOf(addr2.address)).to.be.equal(ethers.utils.parseEther("997"));
            expect(await erc721Token.ownerOf(1)).to.be.equal(market.address);

            await market.setAuctionPeriod(3);
            expect(await market.auctionPeriod()).to.equal(3);
            await new Promise(f => setTimeout(f, 4000));

            await market.finishAuction(1);

            expect(await erc20Token.balanceOf(owner.address)).to.be.equal(ethers.utils.parseEther("0"));
            expect(await erc20Token.balanceOf(addr1.address)).to.be.equal(ethers.utils.parseEther("1000"));
            expect(await erc20Token.balanceOf(addr2.address)).to.be.equal(ethers.utils.parseEther("1000"));
            expect(await erc721Token.ownerOf(1)).to.be.equal(owner.address);
        });
    });

    describe("Cancel Auction", function() {

        it("Should revert", async function() {
            await market.createItem("uri", owner.address);
            await expect(market.cancelAuction(1)).to.be.revertedWith("Item is not on sale");

            await market.listItemOnAuction(1, ethers.utils.parseEther("1"));
            await expect(market.cancelAuction(1)).to.be.revertedWith("Auction is not finished yet");

            await expect(market.connect(addr1).cancelAuction(1)).to.be.revertedWith("Sender is not the owner");

            await erc20Token.mint(addr1.address, ethers.utils.parseEther("1000"));
            await erc20Token.connect(addr1).approve(market.address, ethers.utils.parseEther("1000"));

            await market.connect(addr1).makeBid(1, ethers.utils.parseEther("2"));

            await market.setAuctionPeriod(3);
            expect(await market.auctionPeriod()).to.equal(3);
            await new Promise(f => setTimeout(f, 4000));

            await expect(market.cancelAuction(1)).to.be.revertedWith("There are current bids");
        });

        
        it("Should cancel auction correctly", async function() {
            await market.createItem("uri", owner.address);
            await market.listItemOnAuction(1, ethers.utils.parseEther("1"));

            await market.setAuctionPeriod(3);
            expect(await market.auctionPeriod()).to.equal(3);
            await new Promise(f => setTimeout(f, 4000));

            await market.cancelAuction(1);
        });
    });

});