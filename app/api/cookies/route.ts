import { NextResponse } from "next/server";

export async function GET() {
    try {
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

        const text = await res.text();

        return NextResponse.json({ cookies: res.headers.get("set-cookie") || "", res: text });

    } catch (error) {
        return NextResponse.json({ error: 'An error occurred while fetching cookies.' }, { status: 500 });
    }
}