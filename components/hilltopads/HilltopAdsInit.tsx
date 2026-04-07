"use client";

import { useEffect } from "react";
import {
  initInPagePush,
  initVideoSlider,
} from "./hilltopads";

export default function HilltopAdsInit() {
  useEffect(() => {
    initInPagePush();
    initVideoSlider();
  }, []);

  return null;
}