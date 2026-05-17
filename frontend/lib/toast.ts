/**
 * lib/toast.ts
 * ─────────────
 * Zero-dependency toast system. No external library needed.
 * Works by injecting a container into the DOM and managing it.
 *
 * Usage:
 *   import { toast } from "@/lib/toast";
 *   toast.success("Trip saved!");
 *   toast.error("Something went wrong.");
 *   toast.info("Loading data...");
 */

type ToastType = "success" | "error" | "info" | "warning";

interface ToastOptions {
  duration?: number;  // ms, default 3500
}

function getContainer(): HTMLElement {
  let el = document.getElementById("__toast_container__");
  if (!el) {
    el = document.createElement("div");
    el.id = "__toast_container__";
    el.setAttribute("style", [
      "position:fixed",
      "bottom:24px",
      "right:24px",
      "z-index:9999",
      "display:flex",
      "flex-direction:column",
      "gap:10px",
      "pointer-events:none",
    ].join(";"));
    document.body.appendChild(el);
  }
  return el;
}

const ICONS: Record<ToastType, string> = {
  success: "✓",
  error:   "✕",
  warning: "⚠",
  info:    "ℹ",
};

const COLORS: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: "rgba(20,83,45,0.96)",  border: "rgba(34,197,94,0.3)",  icon: "#4ade80" },
  error:   { bg: "rgba(69,10,10,0.96)",  border: "rgba(239,68,68,0.3)",  icon: "#f87171" },
  warning: { bg: "rgba(69,26,3,0.96)",   border: "rgba(251,146,60,0.3)", icon: "#fb923c" },
  info:    { bg: "rgba(15,23,42,0.96)",  border: "rgba(79,142,247,0.3)", icon: "#4f8ef7" },
};

function show(message: string, type: ToastType, opts: ToastOptions = {}): void {
  if (typeof document === "undefined") return;

  const duration = opts.duration ?? 3500;
  const container = getContainer();
  const { bg, border, icon } = COLORS[type];

  const el = document.createElement("div");
  el.setAttribute("style", [
    `background:${bg}`,
    `border:1px solid ${border}`,
    "border-radius:12px",
    "padding:12px 16px",
    "display:flex",
    "align-items:center",
    "gap:10px",
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    "font-size:14px",
    "color:#f8fafc",
    "box-shadow:0 8px 32px rgba(0,0,0,0.4)",
    "pointer-events:all",
    "min-width:240px",
    "max-width:380px",
    "opacity:0",
    "transform:translateY(12px)",
    "transition:opacity 0.22s ease,transform 0.22s ease",
  ].join(";"));

  el.innerHTML = `
    <span style="font-size:15px;font-weight:700;color:${icon};flex-shrink:0">${ICONS[type]}</span>
    <span style="flex:1;line-height:1.4">${message}</span>
  `;

  container.appendChild(el);

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    });
  });

  // Animate out and remove
  const remove = () => {
    el.style.opacity = "0";
    el.style.transform = "translateY(12px)";
    setTimeout(() => el.remove(), 250);
  };

  setTimeout(remove, duration);
  el.addEventListener("click", remove);  // click to dismiss
}

export const toast = {
  success: (msg: string, opts?: ToastOptions) => show(msg, "success", opts),
  error:   (msg: string, opts?: ToastOptions) => show(msg, "error",   opts),
  warning: (msg: string, opts?: ToastOptions) => show(msg, "warning", opts),
  info:    (msg: string, opts?: ToastOptions) => show(msg, "info",    opts),
};
