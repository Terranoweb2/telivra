"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const GPSMap = dynamic(() => import("./map-container"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-900 rounded-xl">
      <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
    </div>
  ),
});

export default GPSMap;
