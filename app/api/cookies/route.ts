
import puppeteer from "puppeteer";
import { NextResponse } from "next/server";
import fs from "fs";
import { readFile } from "fs/promises";

const filePath = "./page.html";
export async function GET() {
    try {


        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        await page.goto("https://ffemote.com/login");

        // get cookies
        const cookies = await page.cookies();
        console.log(cookies);

        const text = await page.content();
        //save text to file
        fs.writeFileSync(filePath, text);
        await browser.close();



        const fileBuffer = await readFile(filePath);

        return new Response(fileBuffer, {
            headers: {
                "Content-Type": "text/html",
                "Content-Disposition": "inline; filename=page.html",
            },
        });

    } catch (error) {
        console.log(error)
        return NextResponse.json({ error }, { status: 500 });
    }
}