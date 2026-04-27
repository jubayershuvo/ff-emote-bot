import proxyClient from "./proxy";

interface SendLagParams {
  server: string;
  team_code: string;
  cookies: string[]; // 👈 cookies passed as param
}

export async function sendLag(params: SendLagParams) {
  const { server, team_code, cookies } = params;

  // Convert cookie array to single header string
  const cookieHeader = cookies.join("; ");

  try {
    const response = await proxyClient.post(
      "https://ffemote.com/lag",
      {
        server,
        team_code,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Cookie: cookieHeader,
          Origin: "https://ffemote.com",
          Referer: "https://ffemote.com/",
        },
        withCredentials: true,
      }
    );

    return response.data;
  } catch (error) {
    return {
      success: false,
      error,
    };
  }
}