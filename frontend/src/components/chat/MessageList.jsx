import React, { useRef, useEffect, useState } from 'react';
import { MessageBubble } from './MessageBubble';
import { Loader2, ArrowDown } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

export const MessageList = ({
  messages = [],
  currentUserId,
  loadingEarlier = false,
  hasMore = false,
  onLoadEarlier,
  typingUsers = [],
  onReply,
  onEdit,
  onDelete,
  onToggleReaction,
  onOpenMedia,
}) => {
  const containerRef = useRef(null);
  const bottomRef = useRef(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const prevScrollHeightRef = useRef(0);

  // Maintain scroll position when earlier messages are prepended
  useEffect(() => {
    if (containerRef.current && prevScrollHeightRef.current > 0) {
      const newScrollHeight = containerRef.current.scrollHeight;
      const diff = newScrollHeight - prevScrollHeightRef.current;
      containerRef.current.scrollTop += diff;
      prevScrollHeightRef.current = 0;
    }
  }, [messages]);

  // Initial scroll to bottom
  useEffect(() => {
    if (bottomRef.current && !loadingEarlier) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;

    // Show "Scroll to bottom" button if user scrolled up
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    setShowScrollBottom(!isNearBottom);

    // If reached top, trigger cursor pagination
    if (scrollTop === 0 && hasMore && !loadingEarlier && onLoadEarlier) {
      prevScrollHeightRef.current = scrollHeight;
      onLoadEarlier();
    }
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Helper to group messages by date
  const groupMessagesByDate = (msgs) => {
    const groups = [];
    let currentDate = null;

    msgs.forEach((msg) => {
      const msgDate = new Date(msg.created_at || msg.createdAt).toDateString();
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ type: 'date_divider', date: msg.created_at || msg.createdAt, id: `date_${msgDate}` });
      }
      groups.push({ type: 'message', data: msg, id: msg.id });
    });

    return groups;
  };

  const groupedItems = groupMessagesByDate(messages);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1 select-none scrollbar-thin"
    >
      {/* Load Earlier Messages Spinner / Trigger */}
      {hasMore && (
        <div className="flex justify-center py-2">
          {loadingEarlier ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500 shadow-2xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              <span>Loading earlier history...</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (containerRef.current) {
                  prevScrollHeightRef.current = containerRef.current.scrollHeight;
                }
                onLoadEarlier();
              }}
              className="px-3.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-600 transition-colors shadow-2xs"
            >
              Load earlier messages
            </button>
          )}
        </div>
      )}

      {/* Empty State */}
      {messages.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-3">
            💬
          </div>
          <h4 className="text-sm font-bold text-slate-700">No messages yet</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            Send the first message or share files to start collaborating!
          </p>
        </div>
      )}

      {/* Render Grouped Items */}
      {groupedItems.map((item) => {
        if (item.type === 'date_divider') {
          return (
            <div key={item.id} className="flex items-center justify-center my-4">
              <div className="px-3 py-0.5 rounded-full bg-slate-100 border border-slate-200/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 shadow-2xs">
                {formatDate(item.date)}
              </div>
            </div>
          );
        }

        return (
          <MessageBubble
            key={item.id}
            message={item.data}
            currentUserId={currentUserId}
            onReply={onReply}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleReaction={onToggleReaction}
            onOpenMedia={onOpenMedia}
          />
        );
      })}

      {/* Typing Indicators */}
      {typingUsers.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500 italic animate-pulse">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.2s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.4s]" />
          </div>
          <span>
            {typingUsers.map((u) => u.userName).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </span>
        </div>
      )}

      <div ref={bottomRef} className="h-2" />

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="fixed bottom-20 right-8 z-30 p-2.5 rounded-full bg-indigo-600 text-white shadow-xl hover:bg-indigo-700 transition-all hover:scale-105"
          title="Scroll to latest"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
