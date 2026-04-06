"use client";

import { use } from "react";
import { ConversationMobile } from "./conversation-mobile";

export default function MobileConversationPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = use(params);
  return <ConversationMobile threadId={threadId} />;
}
