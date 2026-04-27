
import proxyClient from "@/lib/proxy";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await proxyClient.post("https://ffemote.com/validate_passwords", {
      yt_password: process.env.YT_PASSWORD || "B25",
      tg_password: process.env.TG_PASSWORD || "B25",
    });

    return NextResponse.json(res.data);
  } catch (error) {
    console.log(error);

    return NextResponse.json(
      { error: error },
      { status: 500 }
    );
  }
}