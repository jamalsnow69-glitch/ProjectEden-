const DEFAULT_SOUNDS = {
  startup: "/sounds/eden-startup.mp3",
  message: "/sounds/eden-message.mp3",
  notification: "/sounds/eden-notification.mp3",
  callStart: "/sounds/eden-call-start.mp3",
  callEnd: "/sounds/eden-call-end.mp3",
  login: "/sounds/eden-login.mp3",
  logout: "/sounds/eden-logout.mp3",
  error: "/sounds/eden-error.mp3",
  success: "/sounds/eden-success.mp3",
  thinking: "/sounds/eden-thinking.mp3",
  send: "/sounds/eden-send.mp3",
  uploadStart: "/sounds/eden-upload-start.mp3",
  uploadComplete: "/sounds/eden-upload-complete.mp3",
  openChat: "/sounds/eden-open-chat.mp3",
  deleteChat: "/sounds/eden-delete-chat.mp3",
  renameChat: "/sounds/eden-rename-chat.mp3",
  themeSwitch: "/sounds/eden-theme-switch.mp3",
  settingsToggle: "/sounds/eden-settings-toggle.mp3",
  warning: "/sounds/eden-warning.mp3",
  panelOpen: "/sounds/eden-panel-open.mp3",
  panelClose: "/sounds/eden-panel-close.mp3",
};

function playPreview(src, volume = 0.45) {
  if (!src) return;

  try {
    const audio = new Audio(src);
    audio.volume = Math.max(0, Math.min(1, Number(volume)));
    audio.play().catch(() => {});
  } catch {}
}

export default function SettingsPage({
  currentTheme,
  voiceEnabled = false,
  autoReadResponses = false,
  reasoningLevel = "balanced",
  memoryDepth = "standard",
  soundEnabled = true,
  startupSoundEnabled = true,
  thinkingSoundEnabled = true,
  soundVolume = 0.45,
  reasoningLevels = [],
  memoryDepths = [],
  sounds = DEFAULT_SOUNDS,
  onVoiceEnabledChange,
  onAutoReadResponsesChange,
  onReasoningLevelChange,
  onMemoryDepthChange,
  onSoundEnabledChange,
  onStartupSoundEnabledChange,
  onThinkingSoundEnabledChange,
  onSoundVolumeChange,
}) {
  const border = currentTheme?.border || "border-white/10";
  const card = currentTheme?.card || "bg-zinc-950";

  const cleanReasoningLevels = reasoningLevels.length
    ? reasoningLevels
    : [
        { id: "fast", name: "Fast", description: "Quick replies with lower latency." },
        { id: "balanced", name: "Balanced", description: "Default speed and quality mix." },
        { id: "deep", name: "Deep", description: "More careful responses for complex tasks." },
        { id: "maximum", name: "Maximum", description: "Best effort reasoning for hard tasks." },
      ];

  const cleanMemoryDepths = memoryDepths.length
    ? memoryDepths
    : [
        { id: "light", name: "Light", description: "Short context window." },
        { id: "standard", name: "Standard", description: "Normal chat memory." },
        { id: "extended", name: "Extended", description: "Uses more previous context." },
        { id: "full", name: "Full", description: "Maximum available memory depth." },
      ];

  const activeReasoning =
    cleanReasoningLevels.find((item) => item.id === reasoningLevel) ||
    cleanReasoningLevels[1];

  const activeMemory =
    cleanMemoryDepths.find((item) => item.id === memoryDepth) ||
    cleanMemoryDepths[1];

  function toggleButtonClass(active) {
    return `rounded-2xl border px-4 py-3 text-sm font-bold transition hover:scale-[1.02] ${
      active
        ? "border-white bg-white text-black"
        : "border-white/10 bg-black/30 opacity-70"
    }`;
  }

  return (
    <section className={`eden-page flex-1 overflow-y-auto rounded-3xl border ${border} ${card} p-6`}>
      <div>
        <h2 className="text-2xl font-bold tracking-[0.15em]">
          SETTINGS
        </h2>

        <p className="mt-2 text-sm opacity-70">
          Control Eden voice, AI behavior, memory depth, interface sounds, and future app preferences.
        </p>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <h3 className="text-lg font-bold">Voice Settings</h3>

          <p className="mt-2 text-sm opacity-70">
            Configure speech input, spoken responses, and call behavior.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onVoiceEnabledChange?.(!voiceEnabled)}
              className={toggleButtonClass(voiceEnabled)}
            >
              Voice: {voiceEnabled ? "Enabled" : "Disabled"}
            </button>

            <button
              type="button"
              onClick={() => onAutoReadResponsesChange?.(!autoReadResponses)}
              className={toggleButtonClass(autoReadResponses)}
            >
              Auto Read: {autoReadResponses ? "On" : "Off"}
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <h3 className="text-lg font-bold">AI Settings</h3>

          <p className="mt-2 text-sm opacity-70">
            These settings are saved now. Backend behavior can be wired later.
          </p>

          <div className="mt-4 space-y-4">
            <label className="block text-sm opacity-80">
              Reasoning
              <select
                value={reasoningLevel}
                onChange={(event) => onReasoningLevelChange?.(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none"
              >
                {cleanReasoningLevels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
              </select>
            </label>

            <p className="text-xs opacity-60">
              {activeReasoning?.description}
            </p>

            <label className="block text-sm opacity-80">
              Memory Depth
              <select
                value={memoryDepth}
                onChange={(event) => onMemoryDepthChange?.(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none"
              >
                {cleanMemoryDepths.map((depth) => (
                  <option key={depth.id} value={depth.id}>
                    {depth.name}
                  </option>
                ))}
              </select>
            </label>

            <p className="text-xs opacity-60">
              {activeMemory?.description}
            </p>
          </div>
        </div>
      </div>

      <div className={`mt-4 rounded-3xl border ${border} bg-black/20 p-5`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold">Sound Settings</h3>

            <p className="mt-1 text-sm opacity-70">
              Control Eden interface sounds, startup audio, and thinking loops.
            </p>
          </div>

          <button
            type="button"
            onClick={() => playPreview(sounds.notification || sounds.message, soundVolume)}
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold transition hover:scale-[1.02]"
          >
            Test Sound
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <button
            type="button"
            onClick={() => onSoundEnabledChange?.(!soundEnabled)}
            className={toggleButtonClass(soundEnabled)}
          >
            Sounds: {soundEnabled ? "On" : "Off"}
          </button>

          <button
            type="button"
            onClick={() => onStartupSoundEnabledChange?.(!startupSoundEnabled)}
            className={toggleButtonClass(startupSoundEnabled)}
          >
            Startup: {startupSoundEnabled ? "On" : "Off"}
          </button>

          <button
            type="button"
            onClick={() => onThinkingSoundEnabledChange?.(!thinkingSoundEnabled)}
            className={toggleButtonClass(thinkingSoundEnabled)}
          >
            Thinking Loop: {thinkingSoundEnabled ? "On" : "Off"}
          </button>
        </div>

        <label className="mt-5 block text-sm font-bold opacity-80">
          Volume: {Math.round(Number(soundVolume) * 100)}%
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={soundVolume}
            onChange={(event) => onSoundVolumeChange?.(Number(event.target.value))}
            className="mt-3 w-full accent-white"
          />
        </label>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(sounds).map(([name, src]) => (
            <button
              key={name}
              type="button"
              onClick={() => playPreview(src, soundVolume)}
              className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-left text-xs opacity-80 transition hover:scale-[1.02] hover:opacity-100"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <h3 className="text-lg font-bold">Privacy</h3>
          <p className="mt-2 text-sm opacity-70">
            Zero-retention, local-only, and backend sync settings can be added here later.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <h3 className="text-lg font-bold">Model Routing</h3>
          <p className="mt-2 text-sm opacity-70">
            Model picker and provider fallback controls can connect here later.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <h3 className="text-lg font-bold">Developer Mode</h3>
          <p className="mt-2 text-sm opacity-70">
            Prompt playground, token usage, and debug panels can be added in a future batch.
          </p>
        </div>
      </div>
    </section>
  );
}