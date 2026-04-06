"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { InboxMobile } from "./inbox-mobile";

export default function MobileInboxPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      }
    >
      <InboxMobile />
    </Suspense>
  );
}
