//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./interfaces/IERC721.sol";
import "./interfaces/IERC20.sol";

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";


contract MarketPlace is AccessControl, ReentrancyGuard {
    bytes32 public constant ADMIN = keccak256("ADMIN");

    address public nftContract;
    address public erc20Contract;

    uint256 public auctionPeriod = 3 days;

    enum ItemStatus {
        NONE,
        ON_SALE,
        SOLD,
        CANCELLED,
        ON_AUCTION
    }

    struct OrderInfo {
        address owner;
        address buyer;
        uint256 price;
        uint256 numOfBids;
        uint256 startTime;
        ItemStatus status;
    }

    mapping(uint256 => OrderInfo) public orders;

    constructor(address _nftContract, address _erc20Contract) {
        _setupRole(ADMIN, msg.sender);

        nftContract = _nftContract;
        erc20Contract = _erc20Contract;
    }

    function createItem(string memory _tokenURI, address _owner) public {
        IERC721(nftContract).mint(_owner, _tokenURI);
    }

    function _list(
        uint256 _tokenId, 
        uint256 _price, 
        address _owner, 
        ItemStatus _status
    ) private tokenExists(_tokenId) {
        require(IERC721(nftContract).ownerOf(_tokenId) == _owner, "Sender is not the owner");
        require(_price > 0, "Price should be positive");
        
        OrderInfo memory orderInfo = orders[_tokenId];

        IERC721(nftContract).transferFrom(_owner, address(this), _tokenId);

        orderInfo.owner = _owner;
        orderInfo.price = _price;
        orderInfo.status = _status;
        orderInfo.startTime = block.timestamp;

        orders[_tokenId] = orderInfo;
    }

    function listItem(uint256 _tokenId, uint256 _price) public nonReentrant returns (bool) {
        _list(_tokenId, _price, msg.sender, ItemStatus.ON_SALE);

        return true;
    }

    function cancel(uint256 _tokenId) public tokenExists(_tokenId) nonReentrant returns (bool) {
        OrderInfo memory orderInfo = orders[_tokenId];
        require(
            orderInfo.status == ItemStatus.ON_SALE, 
            "Item is not on sale"
        );
        require(orderInfo.owner == msg.sender, "Sender is not the owner");

        IERC721(nftContract).safeTransferFrom(address(this), orderInfo.owner, _tokenId);

        orderInfo.status = ItemStatus.CANCELLED;
        orders[_tokenId] = orderInfo;

        return true;
    }

    function buyItem(uint256 _tokenId) public tokenExists(_tokenId) nonReentrant returns (bool) {
        OrderInfo memory orderInfo = orders[_tokenId];
        require(
            orderInfo.status == ItemStatus.ON_SALE, 
            "Item is not on sale"
        );
        require(orderInfo.owner != msg.sender, "Buyer cannot be the owner");

        IERC20(erc20Contract).transferFrom(msg.sender, orderInfo.owner, orderInfo.price);
        IERC721(nftContract).safeTransferFrom(address(this), msg.sender, _tokenId);

        orderInfo.status = ItemStatus.SOLD;
        orders[_tokenId] = orderInfo;

        return true;
    }

    function listItemOnAuction(uint256 _tokenId, uint256 _minPrice) public nonReentrant returns (bool) {
        _list(_tokenId, _minPrice, msg.sender, ItemStatus.ON_AUCTION);

        return true;
    }

    function makeBid(uint256 _tokenId, uint256 _price) 
        public tokenExists(_tokenId) nonReentrant returns (bool) {
        require(_price > 0, "Price should be positive");

        OrderInfo memory orderInfo = orders[_tokenId];
        require(
            orderInfo.status == ItemStatus.ON_AUCTION, 
            "Item is not on auction"
        );
        require(block.timestamp - orderInfo.startTime < auctionPeriod, "Auction is finished");
        require(_price > orderInfo.price, "Price is lower than final bid");

        if (orderInfo.numOfBids > 0) {
            IERC20(erc20Contract).transfer(orderInfo.buyer, orderInfo.price);
        }

        IERC20(erc20Contract).transferFrom(msg.sender, address(this), _price);
        
        orderInfo.price = _price;
        orderInfo.buyer = msg.sender;
        orderInfo.numOfBids++;
        orders[_tokenId] = orderInfo;

        return true;
    }

    function finishAuction(uint256 _tokenId) 
        public tokenExists(_tokenId) nonReentrant returns (bool) {
        OrderInfo memory orderInfo = orders[_tokenId];
        require(
            orderInfo.status == ItemStatus.ON_AUCTION, 
            "Item is not on sale"
        );
        require(block.timestamp - orderInfo.startTime > auctionPeriod, "Auction is not finished yet");

        if (orderInfo.numOfBids > 2) {
            IERC721(nftContract).safeTransferFrom(address(this), orderInfo.buyer, _tokenId);
            IERC20(erc20Contract).transfer(orderInfo.owner, orderInfo.price);
            orderInfo.status = ItemStatus.SOLD;
        } else {
            IERC721(nftContract).safeTransferFrom(address(this), orderInfo.owner, _tokenId);
            IERC20(erc20Contract).transfer(orderInfo.buyer, orderInfo.price);
            orderInfo.status = ItemStatus.CANCELLED;
        }

        orders[_tokenId] = orderInfo;
        return true;
    }

    function cancelAuction(uint256 _tokenId) 
        public tokenExists(_tokenId) nonReentrant returns (bool) {
        OrderInfo memory orderInfo = orders[_tokenId];
        require(
            orderInfo.status == ItemStatus.ON_AUCTION, 
            "Item is not on sale"
        );
        require(orderInfo.owner == msg.sender, "Sender is not the owner");
        require(block.timestamp - orderInfo.startTime > auctionPeriod, "Auction is not finished yet");
        require(orderInfo.numOfBids == 0, "There are current bids");


        IERC721(nftContract).safeTransferFrom(address(this), orderInfo.owner, _tokenId);

        orderInfo.status = ItemStatus.CANCELLED;
        orders[_tokenId] = orderInfo;

        return true;
    }

    modifier tokenExists(uint256 _tokenId) {
        uint256 currentIdx = IERC721(nftContract).currentIdx();
        require(_tokenId <= currentIdx, "Token doesn't exist");
        require(_tokenId > 0, "Token id must be positive");
        _;
    }

    // setters
    function setNftContract(address _nftContract) public onlyRole(ADMIN) {
        nftContract = _nftContract;
    }

    function setErc20Contract(address _erc20Contract) public onlyRole(ADMIN) {
        erc20Contract = _erc20Contract;
    }

    function setAuctionPeriod(uint256 _auctionPeriod) public onlyRole(ADMIN) {
        auctionPeriod = _auctionPeriod;
    }

}