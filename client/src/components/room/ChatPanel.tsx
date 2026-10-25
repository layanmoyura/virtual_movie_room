import React, { useState, useEffect, useRef } from "react";
import { Send, MessageSquare } from "lucide-react";
import { ChatMessage } from "@virtual-movie-room/shared";

interface ChatPanelProps {
  messages: ChatMessage[];
  selfParticipantId: string;
  mutedUserIds: Set<string>;
  onSendMessage: (text: string) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  selfParticipantId,
  mutedUserIds,
  onSendMessage
}) => {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    onSendMessage(inputText.trim());
    setInputText("");
  };

  const visibleMessages = messages.filter((m) => !mutedUserIds.has(m.participantId));

  return (
    <div className="flex flex-col h-full bg-cinema-card rounded-xl border border-cinema-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-cinema-border flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-cinema-accent" />
        <span className="font-semibold text-white text-xs sm:text-sm">Room Chat</span>
        <span className="text-[11px] text-gray-500 ml-auto">Ephemeral</span>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
        {visibleMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 py-8">
            <p className="text-xs">No messages yet. Say hello!</p>
          </div>
        ) : (
          visibleMessages.map((msg) => {
            const isSelf = msg.participantId === selfParticipantId;
            const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
            });

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}
              >
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className={`text-[11px] font-medium ${isSelf ? "text-cinema-accent" : "text-gray-400"}`}>
                    {msg.displayName} {isSelf && "(You)"}
                  </span>
                  <span className="text-[10px] text-gray-600 font-mono">{timeStr}</span>
                </div>
                <div
                  className={`px-3 py-1.5 rounded-xl text-xs max-w-[85%] break-words ${
                    isSelf
                      ? "bg-cinema-accent text-white rounded-tr-none"
                      : "bg-cinema-surface border border-cinema-border text-gray-200 rounded-tl-none"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-cinema-border bg-cinema-surface/50">
        <div className="relative flex items-center">
          <input
            type="text"
            maxLength={500}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="w-full pl-3 pr-10 py-2 bg-cinema-surface border border-cinema-border rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cinema-accent"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="absolute right-1.5 p-1.5 rounded-md bg-cinema-accent hover:bg-blue-600 disabled:opacity-40 text-white transition"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
};
