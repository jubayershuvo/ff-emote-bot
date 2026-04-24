import cloudscraper from "cloudscraper";
import { NextResponse } from "next/server";

export async function GET() {
    try {

        const res = await cloudscraper({
            method: 'POST',
            url: 'https://ffemote.com/validate_passwords',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'https://ffemote.com',
                'Referer': 'https://ffemote.com/login'
            },
            body: JSON.stringify({
                yt_password: process.env.YT_PASSWORD || "B25",
                tg_password: process.env.TG_PASSWORD || "B25"
            }),
            // Cloudscraper automatically handles the challenge
        });

        const text = await res.text();

        return NextResponse.json({ cookies: res.headers.get("set-cookie") || "", res: text });

    } catch (error) {
        return NextResponse.json({ error: 'An error occurred while fetching cookies.' }, { status: 500 });
    }
}