"use strict";

const catalyst = require("zcatalyst-sdk-node");
const axios = require("axios");

const HOST = "https://newsapi.org";
const TABLENAME = [
  "HEADLINES",
  "BUSINESS",
  "ENTERTAINMENT",
  "HEALTH",
  "SCIENCE",
  "SPORTS",
  "TECHNOLOGY",
];
const COUNTRY = "IN";
const APIKEY = "4fff188e01c34738a7d8d9d83592bd05";
const DATASTORE_LOAD = 5;

const pushNewstoDatastore = async ({ table, rowIds, articles }) => {
  return Promise.all(
    articles.map(async (article, idx) => {
      const payload = {
        title: article.title,
        url: article.url,
      };
      if (rowIds.length === 0) {
        //insert the new row
        return table.insertRow(payload);
      }
      return table.updateRow({ ...payload, ROWID: rowIds[idx] });
    })
  );
};

module.exports = async (_cronDetails, context) => {
  try {
    const catalystApp = catalyst.initialize(context);
    const zcqlAPI = catalystApp.zcql();
    const datastoreAPI = catalystApp.datastore();
    //async fetch news and query table
    const metaArr = await Promise.all(
      TABLENAME.map(async (table) => {
        //construct request path to newsapi
        let url = `${HOST}/v2/top-headlines?country=${COUNTRY}&apiKey=${APIKEY}`;
        if (table !== TABLENAME[0]) {
          url += "&category=" + table;
        }
        const response = await axios({
          method: "GET",

          url,
        });

        let data = response.data;

        //query using zcql to check if row exists
        const queryResult = await zcqlAPI.executeZCQLQuery(
          `SELECT ROWID FROM ${table}`
        );
        return {
          table_name: table,
          table: datastoreAPI.table(table),
          zcql_response: queryResult,
          articles: data.articles.splice(0, 15),
        };
      })
    );
    //sync insert/update to datastore
    for (const meta of metaArr) {
      let rowIds = [];
      while (meta.articles.length > 0) {
        const chunk = meta.articles.splice(0, DATASTORE_LOAD);
        if (meta.zcql_response.length > 0) {
          rowIds = meta.zcql_response
            .splice(0, DATASTORE_LOAD)
            .map((row) => row[meta.table_name].ROWID);
        }
        await pushNewstoDatastore({ ...meta, articles: chunk, rowIds });
      }
      console.log(
        `${meta.table} table ${
          rowIds.length === 0 ? "inserted" : "updated"
        } with current news'`
      );
    }
    context.closeWithSuccess();
  } catch (err) {
    console.log(err);
    context.closeWithFailure();
  }
};
