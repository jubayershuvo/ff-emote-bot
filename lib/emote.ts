import proxyClient from "./proxy";

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
    const response = await proxyClient.post(
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
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error("Send Emote Error:", error);
    throw error;
  }
}