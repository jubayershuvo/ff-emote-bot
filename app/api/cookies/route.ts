import cloudscraper from "cloudscraper";
import { NextResponse } from "next/server";

export async function GET() {
    try {

        const res = await cloudscraper({
            method: 'POST',
            url: 'https://ffemote.com/login',
        });

        const text = await res.text();

        return NextResponse.json({ cookies: res.headers.get("set-cookie") || "", res: text });

    } catch (error) {
        return NextResponse.json({ error: 'An error occurred while fetching cookies.' }, { status: 500 });
    }
}