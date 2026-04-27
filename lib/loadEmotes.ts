import proxyClient from "./proxy";


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
    const response = await proxyClient.get(
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
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error("Load Emotes Error:", error);
    throw error;
  }
}