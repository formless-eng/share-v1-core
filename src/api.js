require('dotenv').config();
const { Web3 } = require('web3');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const chain = 'POLYGON';
const web3 = new Web3(process.env[`${chain}_MAINNET_URL`]);


const contractABI = [
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "recipient",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "contractAddress",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "Grant",
		"type": "event"
	}
];

const contractAddress = process.env[`${chain}_CONTRACT_ADDRESS`];
const contract = new web3.eth.Contract(contractABI, contractAddress);



const getMetaName = async (url) => {
	try {
		const response = await axios.get(url);
		const $ = cheerio.load(response.data);
		const ogTitle = $('meta[property="og:title"]').attr('content');
		return ogTitle ? ogTitle.split(' (')[0] : "No og:title meta tag found";
	} catch (error) {
		console.error("An error occurred:", error);
		return "Failed to fetch the page";
	}
};

const updateData = async () => {
	try {
		const events = await contract.getPastEvents('Grant', {
			fromBlock: 0,
			toBlock: 'latest'
		});

		let counts = {};
		for (const event of events) {
			let key = event.returnValues.contractAddress;
			counts[key] = counts[key] || { count: 0, url: "", metaName: "" };
			counts[key].count += 1;

			if (counts[key].count === 1) {
				const url = `https://app.share.formless.xyz/assets/polygon/${key}`;
				counts[key].url = url;
				counts[key].metaName = await getMetaName(url);
			}
		}

		let sorted = Object.entries(counts).sort((a, b) => b[1].count - a[1].count);
		console.log(sorted);

		fs.writeFile('./public/api.json', JSON.stringify(sorted, null, 2), err => {
			if (err) {
				console.error(err);
				return;
			}
			console.log('Event logs saved to api.json');
		});
	} catch (error) {
		console.error(error);
	}
};

setInterval(updateData, 3600000);
updateData();
