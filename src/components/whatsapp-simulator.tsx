"use client";

import { useRef, useState, useTransition } from "react";
import { simulateIncoming } from "@/app/(app)/whatsapp/actions";

type Msg = { from: "patient" | "bot"; text: string };

export function WhatsappSimulator({ defaultPhone }: { defaultPhone: string }) {
  const [phone, setPhone] = useState(defaultPhone);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [pending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  const send = () => {
    const text = input.trim();
    if (!text || pending) return;
    setInput("");
    setMessages((m) => [...m, { from: "patient", text }]);
    startTransition(async () => {
      const reply = await simulateIncoming(phone, text);
      setMessages((m) => [...m, { from: "bot", text: reply }]);
      setTimeout(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
      }, 0);
    });
  };

  return (
    <div className="flex flex-col h-[480px]">
      <label className="mb-3 text-sm">
        <span className="block text-gray-500 mb-1">מספר הטלפון של המטופל (כפי שמופיע בתיק)</span>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          dir="ltr"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
        />
      </label>
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto rounded-xl bg-[#e5ddd5] p-4 space-y-2"
      >
        {messages.length === 0 && (
          <div className="text-center text-sm text-gray-500 pt-10">
            כתבו "שלום" כדי להתחיל שיחה עם הבוט 💬
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.from === "patient" ? "justify-start" : "justify-end"}`}>
            <div
              className={`max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap shadow-sm ${
                m.from === "patient" ? "bg-white" : "bg-[#d9fdd3]"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {pending && <div className="text-xs text-gray-500">הבוט מקליד…</div>}
      </div>
      <div className="flex gap-2 mt-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="הודעה מהמטופל…"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
        />
        <button
          onClick={send}
          disabled={pending}
          className="bg-primary hover:bg-primary-dark text-white font-medium rounded-lg px-4 py-2 text-sm disabled:opacity-50"
        >
          שליחה
        </button>
      </div>
    </div>
  );
}
