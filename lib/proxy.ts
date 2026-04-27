import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";

const proxy = "http://etucgkox:169do6lj2wdo@31.59.20.176:6754";
const agent = new HttpsProxyAgent(proxy);

const proxyClient = axios.create({
  httpsAgent: agent,
  httpAgent: agent
});


export default proxyClient;