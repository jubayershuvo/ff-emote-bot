export async function loginAndCollectCookies() {
  const res = await fetch('https://ffemote.com/validate_passwords', {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://ffemote.com",
      Referer: "https://ffemote.com/login",
    },
    body: JSON.stringify({
      yt_password: process.env.YT_PASSWORD || "B25",
      tg_password: process.env.TG_PASSWORD || "B25",
    }),
  });

  const cookies = res.headers.get("set-cookie") || "";
  const cookiesStr: string = cookies ?? "";


  const cookiesArr: string[] = [];

  // Regex to capture all "key=value" before first semicolon of each cookie
  const cookieRegex = /([^\s,=]+=[^;,\s]+)/g;
  //match
  let match: RegExpExecArray | null;
  while ((match = cookieRegex.exec(cookiesStr)) !== null) {
    cookiesArr.push(match[1]);
  }

  return cookiesArr;
}
