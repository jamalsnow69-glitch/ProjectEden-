export default function ChatShell(props) {
  const {
    currentTheme,
    messages = [],
    input = "",
    isLoggedIn = false,
    isSending = false,
    isUploading = false,
    isListening = false,
    chatEndRef,
    onInputChange,
    onSendMessage,
    onUploadFile,
    onVoiceInput,
    onStartNewChat,
  } = props || {};

  const border = currentTheme && currentTheme.border ? currentTheme.border : "border-white/10";
  const card = currentTheme && currentTheme.card ? currentTheme.card : "bg-zinc-950";

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      if (typeof onSendMessage === "function") {
        onSendMessage();
      }
    }
  }

  function handleInputChange(event) {
    if (typeof onInputChange === "function") {
      onInputChange(event.target.value);
    }
  }

  function handleSendClick() {
    if (typeof onSendMessage === "function") {
      onSendMessage();
    }
  }

  function handleVoiceClick() {
    if (typeof onVoiceInput === "function") {
      onVoiceInput();
    }
  }

  function handleStartNewChat() {
    if (typeof onStartNewChat === "function") {
      onStartNewChat();
    }
  }

  function getSender(message) {
    return message && (message.sender || message.role) ? message.sender || message.role : "message";
  }

  function getText(message) {
    if (!message) return "";
    return message.text || message.content || "";
  }

  return (
    <section className={`eden-page flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border ${border} ${card}`}>
      <div className="flex-1 overflow-y-auto p-5">
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[260px] items-center justify-center text-center">
            <div className="max-w-md rounded-3xl border border-white/10 bg-black/20 p-8 shadow-2xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl">
                <span>*</span>
              </div>

              <h2 className="mt-5 text-xl font-bold tracking-[0.08em]">
                No messages in this chat.
              </h2>

              <p className="mt-3 text-sm leading-relaxed opacity-70">
                Send a message, start a new chat, or open a saved conversation.
              </p>

              {typeof onStartNewChat === "function" ? (
                <button
                  type="button"
                  onClick={handleStartNewChat}
                  className="mt-6 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black transition hover:scale-[1.02]"
                >
                  Start New Chat
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => {
              const sender = getSender(message);
              const isUser = sender === "user";
              const text = getText(message);
              const key = `${sender}-${index}`;

              return (
                <div
                  key={key}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      isUser
                        ? "rounded-br-sm bg-white text-black"
                        : "rounded-bl-sm border border-white/10 bg-black/30"
                    }`}
                  >
                    {text || (!isUser && isSending ? "Eden is thinking..." : "")}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      <div className="border-t border-white/10 p-4">
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isLoggedIn ? "Message Eden..." : "Log in with Google to message Eden..."}
            rows={1}
            className="min-h-12 flex-1 resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
          />

          <input
            type="file"
            id="eden-upload"
            className="hidden"
            onChange={onUploadFile}
          />

          <label
            htmlFor="eden-upload"
            className="cursor-pointer rounded-2xl border border-white/10 bg-black/30 px-4 py-3 transition hover:scale-[1.02]"
          >
            {isUploading ? "..." : "+"}
          </label>

          <button
            type="button"
            onClick={handleVoiceClick}
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 transition hover:scale-[1.02]"
          >
            {isListening ? "Listening" : "Mic"}
          </button>

          <button
            type="button"
            onClick={handleSendClick}
            disabled={isSending}
            className="rounded-2xl bg-white px-6 py-3 font-bold text-black transition hover:scale-[1.02] disabled:opacity-50"
          >
            {isSending ? "Wait" : "Send"}
          </button>
        </div>
      </div>
    </section>
  );
}