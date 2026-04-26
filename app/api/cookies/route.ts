
import puppeteer from "puppeteer";
import { NextResponse } from "next/server";
import fs from "fs";
export async function GET() {
    try {


        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        await page.goto("https://ffemote.com/login");

        // get cookies
        const cookies = await page.cookies();
        console.log(cookies);

        await browser.close();

        const text = await page.content();
        //save text to file
        fs.writeFileSync("page.html", text);


        return NextResponse.json({ cookies });

    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}