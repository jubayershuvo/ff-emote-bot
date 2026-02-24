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
    const response = await fetch(
      `https://ffemote.com/api/load_more_emotes?offset=${offset}&limit=${limit}`,
      {
        method: "GET",
        headers: {
          Accept: "*/*",
          "User-Agent": "Mozilla/5.0",
          Cookie: cookieHeader,
          Referer: "https://ffemote.com/",
        },
      },
    );

    return await response.json();
  } catch (error) {
    console.error("Load Emotes Error:", error);
    throw error;
  }
}
