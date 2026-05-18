export const EDEN_ASSETS = {
  logos: {
    ucnmvc: "/logos/UCNMVC-LOGO.png",
    edenIcon: "/logos/UCNMVC-LOGO.png",
  },

  backgrounds: {
    emerald: "/backgrounds/eden-emerald.png",
    cyber: "/backgrounds/eden-cyber.png",
    midnight: "/backgrounds/eden-midnight.png",
    matrix: "/backgrounds/eden-matrix.png",
  },

  sounds: {
    startup: "/sounds/eden-startup.mp3",
    message: "/sounds/eden-message.mp3",
    notification: "/sounds/eden-notification.mp3",

    callStart: "/sounds/eden-call-start.mp3",
    callEnd: "/sounds/eden-call-end.mp3",

    login: "/sounds/eden-login.mp3",
    logout: "/sounds/eden-logout.mp3",

    error: "/sounds/eden-error.mp3",
    success: "/sounds/eden-success.mp3",
    warning: "/sounds/eden-warning.mp3",

    thinking: "/sounds/eden-thinking.mp3",
    send: "/sounds/eden-send.mp3",

    uploadStart: "/sounds/eden-upload-start.mp3",
    uploadComplete: "/sounds/eden-upload-complete.mp3",

    openChat: "/sounds/eden-open-chat.mp3",
    deleteChat: "/sounds/eden-delete-chat.mp3",
    renameChat: "/sounds/eden-rename-chat.mp3",

    themeSwitch: "/sounds/eden-theme-switch.mp3",
    settingsToggle: "/sounds/eden-settings-toggle.mp3",

    panelOpen: "/sounds/eden-panel-open.mp3",
    panelClose: "/sounds/eden-panel-close.mp3",
  },

  placeholders: {
    profile: "/logos/UCNMVC-LOGO.png",
    upload: "/placeholders/upload-placeholder.png",
  },
};

export function getAsset(path, fallback = "") {
  return path || fallback;
}

export function preloadImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error("Missing image source."));
      return;
    }

    const image = new Image();
    image.onload = () => resolve(src);
    image.onerror = () => reject(new Error(`Failed to preload image: ${src}`));
    image.src = src;
  });
}

export function preloadImages(paths = []) {
  return Promise.allSettled(paths.map((path) => preloadImage(path)));
}

export function playAssetSound(src, volume = 0.45) {
  if (!src) return null;

  try {
    const audio = new Audio(src);
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.play().catch(() => {});
    return audio;
  } catch {
    return null;
  }
}

export function getThemeBackground(themeId) {
  return EDEN_ASSETS.backgrounds[themeId] || "";
}