'use strict';
var express = require('express');
var app = express();
var catalyst = require('zcatalyst-sdk-node');
app.use(express.json());

//GET API that gets the news from the required table
app.get('/fetchData', (req, res) => {
	var tablename = req.query.tablename;

	//Initializing Catalyst SDK
	var catalystApp = catalyst.initialize(req);

	//Queries the Catalyst Data Store table and gets the required news
	getDataFromCatalystDataStore(catalystApp, tablename).then(newsDetails => {
			res.send({
				"content": newsDetails
			})
	}).catch(err => {
		console.log(err);
		sendErrorResponse(res);
	})
});
/**
 * Executes the Query and fetches the news from the table
 * @param {*} catalystApp 
 * @param {*} tablename 
 */
function getDataFromCatalystDataStore(catalystApp, tablename) {
	return new Promise((resolve, reject) => {
		//Queries the Catalyst Data Store table
		catalystApp.zcql().executeZCQLQuery("Select title,url from " + tablename).then(queryResponse => {
			resolve(queryResponse);
		}).catch(err => {
			reject(err);
		})
	});

}

/**
 * Sends an error response
 * @param {*} res 
 */
function sendErrorResponse(res) {
	res.status(500);
	res.send({
		"error": "Internal server error occurred. Please try again in some time."
	});
}
module.exports = app;