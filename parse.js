const fs = require("fs");
const readline = require("readline");
const nginxLogParser = require("nginx-log-parser");

const FILE_PATH = "[FILE_PATH]";
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

async function main() {
  const data = await parseLineByLine();
  console.log(data);
}

main();
