import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";

const proxy = "http://etucgkox:169do6lj2wdo@31.59.20.176:6754";
const agent = new HttpsProxyAgent(proxy);

export async function loadEmotes({
  offset,
  limit,
  cookies,
}: {
  offset: number;
  limit: number;
  cookies: string[];
}) {
  const cookieHeader = cookies.join("; ");

  try {
    const response = await axios.get(
      `https://ffemote.com/api/load_more_emotes`,
      {
        params: {
          offset,
          limit,
        },
        headers: {
          Accept: "*/*",
          "User-Agent": "Mozilla/5.0",
          Cookie: cookieHeader,
          Referer: "https://ffemote.com/",
        },
        httpsAgent: agent,
        httpAgent: agent,
        timeout: 15000,
      }
    );

    return response.data;
  } catch (error) {
    console.error("Load Emotes Error:", error);
    throw error;
  }
}