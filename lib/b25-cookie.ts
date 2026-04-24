
export async function loginAndCollectCookies() {
  const CF_CLEARANCE = "1FXrbM8y_jULyyXnayOrqc5zSuVdMp6cjjR2Z_dGV7o-1777045223-1.2.1.1-uWIn_.G2DixdRdKf_EJFmclwYSxcXHZ15aAkTZZFr4EraUy5FcqNzHs7GQHbCSCfwSmsMfssg.oKSRvcBDI7n0.qMmpBGrJaOOVlrUnxuIAyEQjQ0tYlg6YDjKR2qib9zajbekF04Ljl2ediNkPsjOiNv4tHWrJ2JK9P6YFgM2gvKwDP4jhqORN6FK7avtg1HPT8Vbj9SJgS.hdt.kyXL8RM_7lDPepK50iDI5_32rSGEillHJL0pLdj6CcGauWdslHD4qX_IX04Tish8Mwi25XGOmytT1gwzUX_wU.LDrKTvAYmP9x6oUCcwuMtOF.fFs.00h3JLP9RXOyl.pWq0A";


  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Content-Type": "application/json",
    "Origin": "https://ffemote.com",
    "Referer": "https://ffemote.com/login",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "Cookie": `cf_clearance=${CF_CLEARANCE}`,
  };

  const res = await fetch('https://ffemote.com/validate_passwords', {
    method: "POST",
    headers: headers,
    body: JSON.stringify({
      yt_password: process.env.YT_PASSWORD || "B25",
      tg_password: process.env.TG_PASSWORD || "B25",
    }),
    redirect: 'manual', // handle redirects manually if needed
  });

  const cookies = res.headers.get("set-cookie") || "";
  const cookiesStr: string = cookies ?? "";


  const cookiesArr: string[] = [];
  console.log(cookiesStr)

  // Regex to capture all "key=value" before first semicolon of each cookie
  const cookieRegex = /([^\s,=]+=[^;,\s]+)/g;
  //match
  let match: RegExpExecArray | null;
  while ((match = cookieRegex.exec(cookiesStr)) !== null) {
    cookiesArr.push(match[1]);
  }

  return cookiesArr;
}
