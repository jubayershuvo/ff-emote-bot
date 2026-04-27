import proxyClient from "./proxy";


export async function loginAndCollectCookies() {
  try {
    const res = await proxyClient.post(
      "https://ffemote.com/validate_passwords",
      {
        yt_password: process.env.YT_PASSWORD || "B25",
        tg_password: process.env.TG_PASSWORD || "B25",
      },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0",
        },
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