//SPDX-License-Identifier: Unlicense
pragma solidity  ^0.8.0;


interface IERC721 {
    function mint(address _to, string memory _tokenURI) external returns (uint256);

    function currentIdx() external view returns (uint256);

    function safeTransferFrom(address _from, address _to, uint256 _tokenId) external;

    function transferFrom(address _from, address _to, uint256 _tokenId) external;

    function ownerOf(uint256 _tokenId) external view returns (address);
}