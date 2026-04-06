"use client";
import { showBannerAd, showNativeAd } from "@/components/adsterra/AdPopupProvider";
import { initPopunder, initVignette, openDirectLink } from "@/components/monetag/monetag";
import { useEffect } from "react";

export default function Test() {
    //ads loader
    useEffect(() => {
        // initPopunder();
        // initSocialBar();
        const ad = () => showBannerAd("banner300x250", () => console.log("native reward"),
            5,
            () => console.log("native no reward"),

        );
        // const ad = () => showNativeAd(() => console.log("native reward"),
        //     5,
        //     () => console.log("native no reward"),

        // );
        //run after 2sec
        // const timer = setTimeout(ad, 500);
        // return () => clearTimeout(timer);


        // initPopunder();
    }, []);
    return (
        <div>
  
            <p>This is a test page for the application.</p>
        </div>
    );
}