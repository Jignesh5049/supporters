'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Conversation } from '@/types';
import { useApp } from '@/context/AppContext';
import { Avatar } from '@/components/common/Avatar';
import { Send, Paperclip, Phone, Building, CheckCheck, ChevronLeft } from 'lucide-react';

interface MessageWindowProps {
  conversation: Conversation;
  onBackMobile?: () => void;
}

export function MessageWindow({ conversation, onBackMobile }: MessageWindowProps) {
  const { sendMessage } = useApp();
  const [inputText, setInputText] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    sendMessage(conversation.id, inputText.trim());
    setInputText('');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Business Header */}
      <div className="p-3.5 sm:p-4 bg-white border-b border-border flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {onBackMobile && (
            <button
              onClick={onBackMobile}
              className="md:hidden p-1.5 text-muted-foreground hover:text-foreground"
              aria-label="Back to conversations"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <Avatar
            src={conversation.businessAvatar}
            name={conversation.businessName}
            size="md"
            verified={conversation.businessVerified}
          />

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-foreground truncate">
                {conversation.businessName}
              </h3>
              {conversation.businessVerified && (
                <span className="text-[11px] text-info font-semibold">✓</span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {conversation.businessCity} · {conversation.online ? 'Online now' : 'Responds in ~1h'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/business/${conversation.businessId}`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/ hover:bg-primary/ rounded-xl transition-colors"
          >
            <Building className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Profile</span>
          </Link>
          <a
            href="tel:+919825014890"
            className="p-2 text-info hover:bg-cyan-50 rounded-xl transition-colors"
            title="Call business directly"
          >
            <Phone className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        <div className="text-center my-2">
          <span className="text-[11px] font-medium bg-white px-3 py-1 rounded-full border border-border text-muted-foreground">
            Direct communication channel with {conversation.businessName}
          </span>
        </div>

        {conversation.messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}>
            <div
              className={`max-w-[85%] sm:max-w-md rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                msg.isMe
                  ? 'bg-primary text-white rounded-br-xs'
                  : 'bg-white text-foreground border border-border rounded-bl-xs'
              }`}
            >
              {/* Product attachment inside chat */}
              {msg.attachedProduct && (
                <div className="mb-2.5 p-2.5 rounded-xl bg-black/10 border border-white/20 flex items-center gap-2.5">
                  <div className="w-12 h-12 rounded-lg overflow-hidden relative bg-white shrink-0">
                    <Image
                      src={msg.attachedProduct.image}
                      alt={msg.attachedProduct.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold line-clamp-1">{msg.attachedProduct.title}</p>
                    <p className="text-xs font-semibold text-amber-300">
                      ₹{msg.attachedProduct.price.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              )}

              <p className="whitespace-pre-line">{msg.text}</p>

              <div
                className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                  msg.isMe ? 'text-white/70' : 'text-muted-foreground'
                }`}
              >
                <span>{msg.timestamp}</span>
                {msg.isMe && <CheckCheck className="w-3 h-3 text-cyan-300" />}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Message Input Box */}
      <form
        onSubmit={handleSend}
        className="p-3 sm:p-4 bg-white border-t border-border flex items-center gap-2"
      >
        <button
          type="button"
          onClick={() => alert('Attachments support images, RFQ PDF specs, and GST certificates.')}
          className="p-2 text-muted-foreground hover:text-primary hover:bg-gray-100 rounded-xl transition-colors"
          title="Attach document or catalog"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Type a message to ${conversation.businessName}...`}
          className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:bg-white"
        />

        <button
          type="submit"
          disabled={!inputText.trim()}
          className="inline-flex items-center justify-center p-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl shadow-2xs transition-colors disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
