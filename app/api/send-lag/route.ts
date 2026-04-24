import { loginAndCollectCookies } from "@/lib/b25-cookie";
import { sendLag } from "@/lib/lobby-lag";
import { verifyOTP } from "@/lib/otp";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  let body;

  try {
    body = await request.json();
  } catch (err) {
    console.log(err)
    return NextResponse.json(
      { error: "Invalid or empty JSON body" },
      { status: 400 },
    );
  }

  // const otp = request.headers.get("x-otp");
  // if (!otp) {
  //   return NextResponse.json(
  //     { error: "Missing OTP header" },
  //     { status: 401 },
  //   );
  // }

  // const isOtpValid = await verifyOTP(otp)
  // if (!isOtpValid) {
  //   return NextResponse.json(
  //     { error: "Invalid OTP" },
  //     { status: 401 },
  //   );
  // }

  const { server, team_code } = body;

  if (!server || !team_code) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 },
    );
  }
  try {
    const cookies = await loginAndCollectCookies();
    if (cookies.length === 0) {
      return NextResponse.json(
        { error: "No cookies collected from the login process" },
        { status: 401 },
      );
    }
    const data = await sendLag({
      server,
      team_code,
      cookies,
    });
    return NextResponse.json({ data });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Failed to login and collect cookies" },
      { status: 500 },
    );
  }
}
