import { useEffect, useState } from "react";

const SOUND_ENABLED_KEY = "eden_sound_enabled";
const SOUND_VOLUME_KEY = "eden_sound_volume";
const STARTUP_SOUND_KEY = "eden_startup_sound_enabled";
const THINKING_SOUND_KEY = "eden_thinking_sound_enabled";

const DEFAULT_VOLUME = 0.45;

function getBooleanSetting(key, fallback = true) {
  const value = localStorage.getItem(key);

  if (value === null) {
    return fallback;
  }

  return value !== "false";
}

function getVolumeSetting() {
  const value = Number(localStorage.getItem(SOUND_VOLUME_KEY));

  if (Number.isNaN(value)) {
    return DEFAULT_VOLUME;
  }

  return Math.max(0, Math.min(1, value));
}

function saveBooleanSetting(key, value) {
  localStorage.setItem(key, String(Boolean(value)));
}

function saveVolumeSetting(value) {
  const cleanValue = Math.max(0, Math.min(1, Number(value)));
  localStorage.setItem(SOUND_VOLUME_KEY, String(cleanValue));
}

function playPreview(src, volume) {
  if (!src) return;

  try {
    const audio = new Audio(src);
    audio.volume = Math.max(0, Math.min(1, Number(volume)));
    audio.play().catch(() => {});
  } catch {}
}

export default function SoundSettingsPanel({
  currentTheme,
  sounds = {},
  onSettingsChange,
}) {
  const [soundEnabled, setSoundEnabled] = useState(() => getBooleanSetting(SOUND_ENABLED_KEY, true));
  const [startupEnabled, setStartupEnabled] = useState(() => getBooleanSetting(STARTUP_SOUND_KEY, true));
  const [thinkingEnabled, setThinkingEnabled] = useState(() => getBooleanSetting(THINKING_SOUND_KEY, true));
  const [volume, setVolume] = useState(getVolumeSetting);

  const border = currentTheme?.border || "border-white/10";

  useEffect(() => {
    saveBooleanSetting(SOUND_ENABLED_KEY, soundEnabled);
    saveBooleanSetting(STARTUP_SOUND_KEY, startupEnabled);
    saveBooleanSetting(THINKING_SOUND_KEY, thinkingEnabled);
    saveVolumeSetting(volume);

    if (typeof onSettingsChange === "function") {
      onSettingsChange({
        soundEnabled,
        startupEnabled,
        thinkingEnabled,
        volume,
      });
    }
  }, [soundEnabled, startupEnabled, thinkingEnabled, volume, onSettingsChange]);

  function toggleButtonClass(active) {
    return `rounded-2xl border px-4 py-3 text-sm font-bold transition hover:scale-[1.02] ${
      active
        ? "border-white bg-white text-black"
        : "border-white/10 bg-black/30 opacity-70"
    }`;
  }

  return (
    <div className={`rounded-3xl border ${border} bg-black/20 p-5`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold">Sound Settings</h3>
          <p className="mt-1 text-sm opacity-70">
            Control Eden interface sounds, startup audio, and thinking loops.
          </p>
        </div>

        <button
          type="button"
          onClick={() => playPreview(sounds.notification || sounds.message, volume)}
          className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold transition hover:scale-[1.02]"
        >
          Test Sound
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <button
          type="button"
          onClick={() => setSoundEnabled((current) => !current)}
          className={toggleButtonClass(soundEnabled)}
        >
          Sounds: {soundEnabled ? "On" : "Off"}
        </button>

        <button
          type="button"
          onClick={() => setStartupEnabled((current) => !current)}
          className={toggleButtonClass(startupEnabled)}
        >
          Startup: {startupEnabled ? "On" : "Off"}
        </button>

        <button
          type="button"
          onClick={() => setThinkingEnabled((current) => !current)}
          className={toggleButtonClass(thinkingEnabled)}
        >
          Thinking Loop: {thinkingEnabled ? "On" : "Off"}
        </button>
      </div>

      <label className="mt-5 block text-sm font-bold opacity-80">
        Volume: {Math.round(volume * 100)}%
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(event) => setVolume(Number(event.target.value))}
          className="mt-3 w-full accent-white"
        />
      </label>

      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(sounds).map(([name, src]) => (
          <button
            key={name}
            type="button"
            onClick={() => playPreview(src, volume)}
            className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-left text-xs opacity-80 transition hover:scale-[1.02] hover:opacity-100"
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}