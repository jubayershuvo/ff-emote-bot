// emote.ts

interface SendEmoteParams {
  server: string;
  team_code: string;
  emote_id: string;
  uids: string[];
  auto_leave: boolean;
  cookies: string[]; // 👈 cookies passed as param
}

export async function sendEmote(params: SendEmoteParams) {
  const { server, team_code, emote_id, uids, auto_leave, cookies } = params;

  // Convert cookie array to single header string
  const cookieHeader = cookies.join("; ");

  const response = await fetch("https://ffemote.com/send_emote", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
      Origin: "https://ffemote.com",
      Referer: "https://ffemote.com/",
    },
    body: JSON.stringify({
      server,
      team_code,
      emote_id,
      uids,
      auto_leave,
    }),
  });

  // Collect response cookies
  const jsonResponse = await response.json();
  return jsonResponse;
}
