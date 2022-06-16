require("dotenv").config();

const fs = require("fs");
const readline = require("readline");
const nginxLogParser = require("nginx-log-parser");
const { CogniteClient } = require("@cognite/sdk");
const { ConfidentialClientApplication } = require("@azure/msal-node");
const { v4: uuidv4 } = require("uuid");

// sdk constants
const APP_ID = process.env.APP_ID;
const AUTHORITY = `https://login.microsoftonline.com/${process.env.TENANT_ID}`;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const PROJECT_NAME = process.env.PROJECT_NAME;
const PROJECT_CLUSTER = process.env.PROJECT_CLUSTER;
const DATABASE_NAME = process.env.DATABASE_NAME;
const TABLE_NAME = process.env.TABLE_NAME;

// log constants
const FILE_PATH = process.env.LOG_FILE_PATH;
const LOG_FORMAT =
  "$remote_addr - $remote_user [$time_local] " +
  '"$request" $status $body_bytes_sent "$http_referer" "$http_user_agent"';

async function parseLineByLine() {
  const parser = nginxLogParser(LOG_FORMAT);

  const fileStream = fs.createReadStream(FILE_PATH);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let data = [];
  for await (const line of rl) {
    data.push(parser(line));
  }

  return data;
}

async function initializeSDK() {
  const pca = new ConfidentialClientApplication({
    auth: {
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      authority: AUTHORITY,
    },
  });

  const sdk = new CogniteClient({
    appId: APP_ID,
    baseUrl: PROJECT_CLUSTER,
    project: PROJECT_NAME,
    getToken: () => {
      console.log("get-token");
      return pca
        .acquireTokenByClientCredential({
          scopes: [`${PROJECT_CLUSTER}/.default`],
          skipCache: true,
        })
        .then((response) => response.accessToken);
    },
  });

  await sdk.authenticate();

  return sdk;
}

async function main() {
  const data = await parseLineByLine();
  console.log(data);

  const sdk = await initializeSDK();

  await sdk.raw.insertRows(
    DATABASE_NAME,
    TABLE_NAME,
    data.map((entry) => ({ columns: entry, key: uuidv4() }))
  );
}

main();
