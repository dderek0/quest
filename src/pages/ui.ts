// Shared premium design system for all Quest web pages — derived from quest-promo.html.
// QUEST✦ logo, Space Grotesk + Inter, light theme, VNG-orange + green→blue gradient, soft cards.

export const UI_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800&display=swap');
:root{
  --bg:#f6f8fc; --ink:#16212e; --muted:#54616f; --dim:#8a96a4;
  --line:rgba(20,33,48,.10); --line2:rgba(20,33,48,.16);
  --green:#10b981; --greenD:#059669; --blue:#0068ff; --gold:#b45309;
  --vng:#f1592b; --vng2:#ff7a3c;
  --soft:0 4px 14px rgba(20,33,48,.07); --lift:0 18px 44px rgba(20,33,48,.12);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;color:var(--ink);font-family:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;line-height:1.55;
  -webkit-font-smoothing:antialiased;min-height:100vh;
  background:
    radial-gradient(720px 420px at 0% -8%, rgba(16,185,129,.10), transparent 60%),
    radial-gradient(720px 420px at 100% -2%, rgba(0,104,255,.10), transparent 60%),
    var(--bg);}
.wrap{max-width:600px;margin:0 auto;padding:0 18px 40px}
.display{font-family:'Space Grotesk',sans-serif;letter-spacing:-.02em;line-height:1.08}
.grad{background:linear-gradient(118deg,#0ea869,#10b981 30%,#0a86e0 72%,#0068ff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.eyebrow{font-family:'Space Grotesk',sans-serif;text-transform:uppercase;letter-spacing:.18em;font-size:10.5px;font-weight:700;color:var(--vng)}
.muted{color:var(--muted)} .dim{color:var(--dim)} .hidden{display:none}

/* logo + topbar */
.topbar{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:18px 2px 14px}
.logo{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:23px;letter-spacing:-.02em;color:var(--ink);text-decoration:none;display:inline-flex;align-items:baseline}
.logo span{color:var(--vng);margin-left:1px}
.logo.lg{font-size:28px}

/* buttons */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:700;font-family:'Space Grotesk',sans-serif;
  border-radius:12px;padding:12px 18px;text-decoration:none;font-size:14.5px;cursor:pointer;border:0;transition:.12s;line-height:1}
.btn:active{transform:translateY(1px)}
.btn:disabled{opacity:.6;cursor:default}
.btn.primary{background:linear-gradient(120deg,var(--vng),var(--vng2));color:#fff;box-shadow:0 10px 24px rgba(241,89,43,.28)}
.btn.ghost{background:#fff;color:var(--ink);border:1px solid var(--line2);box-shadow:var(--soft)}
.btn.dark{background:#0d1320;color:#fff}
.btn.ok{background:linear-gradient(120deg,var(--green),var(--greenD));color:#fff}
.btn.block{display:flex;width:100%}
.btn.sm{padding:8px 13px;font-size:13px;border-radius:10px}

/* cards */
.card{background:#fff;border:1px solid var(--line);border-radius:18px;box-shadow:var(--soft);overflow:hidden;margin-bottom:14px}
.card.pad{padding:18px}
.chead{padding:14px 16px;border-bottom:1px solid var(--line);font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:14.5px}
.chead small{display:block;font-family:'Inter',sans-serif;font-weight:500;color:var(--dim);font-size:11.5px;margin-top:3px}
.chead.dark{background:linear-gradient(120deg,#0d1320,#1b2738);color:#fff;border:0}
.chead.dark small{color:#9fb0c4}
.cbody{padding:14px 16px}
/* collapsible sections — native <details class="card"><summary class="chead">…</summary>…</details> */
details.card>summary.chead{display:block;list-style:none;cursor:pointer;position:relative;padding-right:42px;-webkit-user-select:none;user-select:none}
details.card>summary.chead::-webkit-details-marker{display:none}
details.card>summary.chead::after{content:"";position:absolute;right:18px;top:50%;width:8px;height:8px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;opacity:.5;transform:translateY(-50%) rotate(-45deg);transition:transform .18s ease}
details.card[open]>summary.chead::after{transform:translateY(-50%) rotate(45deg)}
@media(prefers-reduced-motion:reduce){details.card>summary.chead::after{transition:none}}

/* forms */
label.field{display:block;font-size:12px;font-weight:700;color:#33414f;margin:12px 0 6px}
input[type=text],input[type=password],textarea,select{width:100%;border:1px solid var(--line2);border-radius:11px;padding:11px 13px;font:inherit;font-size:14px;background:#fbfcfe;color:var(--ink);transition:.12s}
input[type=text]:focus,textarea:focus,select:focus{outline:0;border-color:var(--vng);box-shadow:0 0 0 3px rgba(241,89,43,.12);background:#fff}
textarea{min-height:120px;resize:vertical;line-height:1.5}
input[type=file]{width:100%;font-size:12.5px;border:1px solid var(--line2);border-radius:11px;padding:9px;background:#fbfcfe}

/* misc components */
.chip{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:700;padding:4px 10px;border-radius:99px}
.chip.lvl{color:var(--blue);background:rgba(0,104,255,.10)} .chip.xp{color:var(--greenD);background:rgba(16,185,129,.10)} .chip.fl{color:var(--vng);background:rgba(241,89,43,.10)}
.codechip{display:inline-flex;align-items:center;gap:9px;background:#f1f5fa;border:1px dashed var(--line2);border-radius:99px;padding:6px 12px;font-family:'Space Grotesk',monospace;font-weight:700;font-size:13px}
.cp{border:0;background:#fff;border:1px solid var(--line2);border-radius:8px;padding:4px 9px;font-size:11px;cursor:pointer;font-family:inherit;font-weight:600;color:var(--muted)}
.note{background:#eafaf3;border:1px solid rgba(16,185,129,.30);color:#0b6b4f;border-radius:12px;padding:11px 13px;font-size:13px;line-height:1.5}
.err{color:var(--vng);font-size:12.5px;font-weight:600;margin-top:8px}
.bar{height:8px;border-radius:99px;background:#eef2f7;overflow:hidden}.bar i{display:block;height:100%;background:linear-gradient(90deg,var(--green),var(--blue))}
.spin{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;vertical-align:-2px;margin-right:7px}
@keyframes spin{to{transform:rotate(360deg)}}
a{color:inherit} button{font-family:inherit}
.btn,.cp,.chip,input[type=file],[role=button]{cursor:pointer}
.num{font-variant-numeric:tabular-nums}
:focus-visible{outline:2px solid var(--vng);outline-offset:2px}
@media (prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;transition-duration:.01ms!important}}
`;

export const logo = (cls = '') => `<a class="logo${cls ? ' ' + cls : ''}" href="/">QUEST<span>✦</span></a>`;
export const topbar = (right = '') => `<div class="topbar">${logo()}${right ? `<div class="tbr">${right}</div>` : ''}</div>`;

export function renderPage(o: { title: string; body: string; scripts?: string; css?: string; max?: number }): string {
  return `<!doctype html><html lang="vi"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${o.title}</title><style>${UI_CSS}
.wrap{max-width:${o.max ?? 600}px}
${o.css ?? ''}</style></head>
<body><div class="wrap">${o.body}</div>${o.scripts ?? ''}</body></html>`;
}
