import { useMemo, useState } from "react";
import { markCaptchaPassed } from "../utils/captcha";

function makeProblem() {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;

  return {
    question: `${a} + ${b}`,
    answer: String(a + b),
  };
}

export default function CaptchaPage() {
  const problem = useMemo(() => makeProblem(), []);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");

  function submitCaptcha(event) {
    event.preventDefault();

    if (answer.trim() !== problem.answer) {
      setError("Incorrect captcha. Try again.");
      return;
    }

    markCaptchaPassed();
    window.location.href = "/";
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center p-6">
        <section className="w-full rounded-3xl border border-emerald-400/20 bg-zinc-950 p-6 shadow-2xl">
          <p className="text-xs uppercase tracking-[0.35em] text-emerald-300/70">
            NMVC CAPTCHA LOCK
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-[0.15em]">
            CAPTCHA CHECK
          </h1>

          <p className="mt-3 text-sm opacity-70">
            Complete this quick check to continue to Project Eden.
          </p>

          <form onSubmit={submitCaptcha} className="mt-6 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <p className="text-sm opacity-60">Solve:</p>
              <p className="mt-2 text-4xl font-bold">{problem.question}</p>
            </div>

            <input
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Answer"
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-emerald-400/40"
            />

            {error ? (
              <p className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              className="w-full rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black"
            >
              Continue
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
