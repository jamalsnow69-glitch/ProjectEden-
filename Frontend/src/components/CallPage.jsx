export default function CallPage({
  currentTheme,
  isLoggedIn = false,
  voiceEnabled = false,
  isListening = false,
  autoReadResponses = false,
  onVoiceInput,
  onVoiceEnabledChange,
  onAutoReadResponsesChange,
  onLogin,
}) {
  const border = currentTheme?.border || "border-white/10";
  const card = currentTheme?.card || "bg-zinc-950";

  function toggleButtonClass(active) {
    return `rounded-2xl border px-5 py-3 text-sm font-bold transition hover:scale-[1.02] ${
      active
        ? "border-white bg-white text-black"
        : "border-white/10 bg-black/30 opacity-80"
    }`;
  }

  return (
    <section className={`eden-page flex flex-1 items-center justify-center overflow-y-auto rounded-3xl border ${border} ${card} p-6`}>
      <div className="w-full max-w-3xl text-center">
        <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-[2rem] border border-white/10 bg-black/30 shadow-2xl">
          <div className={`h-12 w-12 rounded-full ${isListening ? "animate-pulse bg-white" : "bg-white/30"}`} />
        </div>

        <p className="mt-8 text-xs uppercase tracking-[0.35em] opacity-60">
          Voice Interface
        </p>

        <h2 className="mt-3 text-4xl font-bold tracking-[0.2em]">
          CALL EDEN
        </h2>

        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed opacity-70">
          Use speech input and voice response settings for a more natural Eden session. Full real-time calling can connect later when the backend voice pipeline is ready.
        </p>

        {!isLoggedIn && (
          <div className="mx-auto mt-6 max-w-md rounded-3xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-sm text-yellow-100">
            Login is required before voice sessions can connect to Eden.
          </div>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {isLoggedIn ? (
            <button
              type="button"
              onClick={onVoiceInput}
              className="rounded-2xl bg-white px-6 py-3 text-sm font-bold text-black transition hover:scale-[1.02]"
            >
              {isListening ? "Listening..." : "Start Talking"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onLogin}
              className="rounded-2xl bg-white px-6 py-3 text-sm font-bold text-black transition hover:scale-[1.02]"
            >
              Login With Google
            </button>
          )}

          <button
            type="button"
            onClick={() => onVoiceEnabledChange?.(!voiceEnabled)}
            className={toggleButtonClass(voiceEnabled)}
          >
            Voice: {voiceEnabled ? "On" : "Off"}
          </button>

          <button
            type="button"
            onClick={() => onAutoReadResponsesChange?.(!autoReadResponses)}
            className={toggleButtonClass(autoReadResponses)}
          >
            Auto Read: {autoReadResponses ? "On" : "Off"}
          </button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-black/20 p-5 text-left">
            <h3 className="text-lg font-bold">Speech Input</h3>
            <p className="mt-2 text-sm opacity-70">
              Uses browser speech recognition when supported.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/20 p-5 text-left">
            <h3 className="text-lg font-bold">Voice Output</h3>
            <p className="mt-2 text-sm opacity-70">
              Uses browser speech synthesis for spoken Eden replies.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/20 p-5 text-left">
            <h3 className="text-lg font-bold">Real Calls</h3>
            <p className="mt-2 text-sm opacity-70">
              Live voice streaming can be added later with backend audio support.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}