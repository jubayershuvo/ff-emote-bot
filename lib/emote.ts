import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";

const proxy = "http://etucgkox:169do6lj2wdo@31.59.20.176:6754";
const agent = new HttpsProxyAgent(proxy);

interface SendEmoteParams {
  server: string;
  team_code: string;
  emote_id: string;
  uids: string[];
  auto_leave: boolean;
  cookies: string[];
}

export async function sendEmote(params: SendEmoteParams) {
  const { server, team_code, emote_id, uids, auto_leave, cookies } = params;

  const cookieHeader = cookies.join("; ");

  try {
    const response = await axios.post(
      "https://ffemote.com/send_emote",
      {
        server,
        team_code,
        emote_id,
        uids,
        auto_leave,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Cookie: cookieHeader,
          Origin: "https://ffemote.com",
          Referer: "https://ffemote.com/",
          "User-Agent": "Mozilla/5.0",
        },
        httpsAgent: agent,
        httpAgent: agent,
        timeout: 15000,
      }
    );

    return response.data;
  } catch (error) {
    console.error("Send Emote Error:", error);
    throw error;
  }
}