"use client";

import { useState } from "react";

import ConnectionsDrawer from "./ConnectionsDrawer";
import DirectChatDrawer from "./chat/DirectChatDrawer";
import { useDirectChat } from "./chat/useDirectChat";

export default function SocialUtilityHub() {
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const chat = useDirectChat();

  return (
    <>
      <ConnectionsDrawer
        open={connectionsOpen}
        onOpenChange={(open) => {
          setConnectionsOpen(open);
          if (open) chat.setOpen(false);
        }}
        onMessage={(peerPlayerId) => {
          setConnectionsOpen(false);
          void chat.openFriendChat(peerPlayerId);
        }}
      />
      <DirectChatDrawer chat={chat} onOpen={() => setConnectionsOpen(false)} />
    </>
  );
}
