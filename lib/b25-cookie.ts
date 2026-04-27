import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";

const proxy = "http://etucgkox:169do6lj2wdo@31.59.20.176:6754";
const agent = new HttpsProxyAgent(proxy);

export async function loginAndCollectCookies() {
  try {
    const res = await axios.post(
      "https://ffemote.com/validate_passwords",
      {
        yt_password: process.env.YT_PASSWORD || "B25",
        tg_password: process.env.TG_PASSWORD || "B25",
      },
      {
        httpsAgent: agent,
        httpAgent: agent,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0",
        },
        timeout: 15000,
      }
    );

    const setCookieHeader =
      res.headers["set-cookie"] || res.headers["Set-Cookie"] || [];

    const cookiesArr: string[] = [];
    const cookieRegex = /([^\s,=]+=[^;,\s]+)/g;

    for (const cookieStr of setCookieHeader) {
      let match: RegExpExecArray | null;

      while ((match = cookieRegex.exec(cookieStr)) !== null) {
        cookiesArr.push(match[1]);
      }
    }


    return cookiesArr;
  } catch (error) {
    console.error("Login error:", error);
    return [];
  }
}