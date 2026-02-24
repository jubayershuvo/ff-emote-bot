// api/image/[name]/route.ts
import { loginAndCollectCookies } from "@/lib/b25-cookie";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> },
) {

  try {
    const { name } = await params;

    const cookies = await loginAndCollectCookies();
    if (cookies.length === 0) {
      return NextResponse.json(
        { error: "No cookies collected from the login process" },
        { status: 401 },
      );
    }

    const response = await fetch(`https://ffemote.com/static/images/${name}`, {
      method: "GET",
      headers: {
        Accept: "*/*",
        "User-Agent": "Mozilla/5.0",
        Cookie: cookies.join("; "),
        Referer: "https://ffemote.com/",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to load emote image" },
        { status: 404 },
      );
    }

    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load emote image" },
      { status: 500 },
    );
  }
}
