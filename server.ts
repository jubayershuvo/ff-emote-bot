import https from "https";
import fs from "fs";
import next from "next";

const dev = true;
const app = next({ dev });
const handle = app.getRequestHandler();

const options = {
  key: fs.readFileSync("./localhost+2-key.pem"),
  cert: fs.readFileSync("./localhost+2.pem"),
};

app.prepare().then(() => {
  https
    .createServer(options, (req, res) => {
      handle(req, res);
    })
    .listen(3000, () => {
      console.log("🚀 HTTPS running on https://localhost:3000");
    });
});