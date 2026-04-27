import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
    });

    const page = await browser.newPage();

    await page.goto("https://ffemote.com/login", {
      waitUntil: "domcontentloaded",
    });

    const cookies = await page.cookies();
    const html = await page.content();

    console.log(cookies)

    await browser.close();

    // Return HTML directly (NO file system)
    return new Response(html, {
      headers: {
        "Content-Type": "text/html",
      },
    });

  } catch (error) {
    console.log(error)
    return NextResponse.json(
      { error: error},
      { status: 500 }
    );
  }
}