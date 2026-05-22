export function shouldShowCaptcha() {
  const passed = sessionStorage.getItem("eden_captcha_passed") === "true";
  if (passed) return false;

  return Math.random() < 0.35;
}

export function makeCaptchaPath() {
  const token = Math.random().toString(36).slice(2, 12);
  return `/${token}/anti-bot/captcha`;
}

export function markCaptchaPassed() {
  sessionStorage.setItem("eden_captcha_passed", "true");
}
