//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";


contract Erc721 is ERC721URIStorage, AccessControl {

    bytes32 public constant ADMIN = keccak256("ADMIN");
    bytes32 public constant MARKET = keccak256("MARKET");
    string public constant EXTENSION = ".json";

    uint256 public currentIdx;
    address public marketplaceAddress;

    constructor (
        string memory _name,
        string memory _symbol,
        address _marketplaceAddress
    ) ERC721(_name, _symbol) {
        _setRoleAdmin(MARKET, ADMIN);

        _setupRole(ADMIN, msg.sender);
        _setupRole(MARKET, _marketplaceAddress);
        
        setApprovalForAll(_marketplaceAddress, true);

        marketplaceAddress = _marketplaceAddress;
    }
    
    function mint(address _to, string memory _tokenURI) external onlyRole(MARKET) returns (uint256) {
        require(_to != address(0), "Mint to zero address");

        currentIdx++;
        _safeMint(_to, currentIdx);
        _setTokenURI(currentIdx, _tokenURI);
        return currentIdx;
    }

    function setMarketplaceAddress(address _marketplaceAddress) public onlyRole(ADMIN) {
        marketplaceAddress = _marketplaceAddress;
    }

    function supportsInterface(bytes4 _interfaceId) public view virtual override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(_interfaceId);
    }

}
