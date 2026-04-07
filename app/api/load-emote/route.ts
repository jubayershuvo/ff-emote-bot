import { loginAndCollectCookies } from "@/lib/b25-cookie";
import { loadEmotes } from "@/lib/loadEmotes";
import { verifyOTP } from "@/lib/otp";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const offset = Number(url.searchParams.get("offset"));
  const limit = Number(url.searchParams.get("limit"));
  const otp = request.headers.get("x-otp");
  if (!otp) {
    return NextResponse.json(
      { error: "Missing OTP header" },
      { status: 401 },
    );
  }

  // const isOtpValid = await verifyOTP(otp)
  // if (!isOtpValid) {
  //   return NextResponse.json(
  //     { error: "Invalid OTP" },
  //     { status: 401 },
  //   );
  // }



  try {
    const cookies = await loginAndCollectCookies();
    if (cookies.length === 0) {
      return NextResponse.json(
        { error: "No cookies collected from the login process" },
        { status: 401 },
      );
    }
    const data = await loadEmotes({
      offset: offset,
      limit: limit,
      cookies: cookies,
    });
    return NextResponse.json(data);
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Failed to load emotes" },
      { status: 500 },
    );
  }
}
