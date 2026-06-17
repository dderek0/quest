import type { CoursePack } from '../domain/types';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800&display=swap');
:root{--vng:#f1592b;--vng2:#ff7a3c;--green:#10b981;--greenD:#059669;--blue:#0068ff;--gold:#b45309;--ink:#16212e;--muted:#54616f;--dim:#8a96a4;--line:rgba(20,33,48,.10);--line2:rgba(20,33,48,.16)}
*{box-sizing:border-box}html,body{margin:0}
body{font-family:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:var(--ink);-webkit-font-smoothing:antialiased;padding:16px;max-width:520px;margin:0 auto;min-height:100vh;
 background:radial-gradient(720px 420px at 0% -8%,rgba(16,185,129,.10),transparent 60%),radial-gradient(720px 420px at 100% -2%,rgba(0,104,255,.10),transparent 60%),#f6f8fc}
.top{display:flex;align-items:center;justify-content:space-between;margin:2px 2px 14px}
.wm{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:22px;letter-spacing:-.02em;color:var(--ink)}
.wm span{color:var(--vng)}
.chips{display:flex;gap:6px}
.chip{font-size:11.5px;font-weight:700;padding:4px 10px;border-radius:99px;font-variant-numeric:tabular-nums}
.chip.lvl{color:var(--blue);background:rgba(0,104,255,.10)}.chip.xp{color:var(--greenD);background:rgba(16,185,129,.10)}.chip.fl{color:var(--vng);background:rgba(241,89,43,.10)}
.prog{height:9px;border-radius:99px;background:#e9eef4;overflow:hidden;margin:4px 0}.prog i{display:block;height:100%;background:linear-gradient(90deg,var(--green),var(--blue));transition:width .3s ease-out}
.pn{font-size:11.5px;color:var(--muted);margin-bottom:12px;font-weight:600}
.qsub{font-family:'Space Grotesk',sans-serif;font-size:14px;font-weight:700;color:var(--ink);margin:2px 0 8px;line-height:1.3}
.qsub .dl{display:block;font-family:'Inter',sans-serif;font-size:11.5px;font-weight:600;color:var(--vng);margin-top:2px}
.card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:18px;box-shadow:0 6px 22px rgba(20,33,48,.07)}
.qq{font-family:'Space Grotesk',sans-serif;font-size:17px;font-weight:600;margin-bottom:15px;line-height:1.4}
.opt{display:flex;align-items:center;gap:11px;border:1.5px solid var(--line2);border-radius:13px;padding:13px;margin-bottom:9px;font-size:14px;cursor:pointer;transition:.12s;min-height:48px;background:#fbfcfe}
.opt:hover{border-color:#c7d0db}
.opt .kk{width:25px;height:25px;border-radius:8px;background:#eef2f7;display:grid;place-items:center;font-weight:700;font-size:12px;color:#6b7a8d;flex:none;font-family:'Space Grotesk',sans-serif}
.opt.sel{border-color:var(--blue);background:rgba(0,104,255,.07)}.opt.sel .kk{background:var(--blue);color:#fff}
.opt.mok{border-color:var(--green);background:rgba(16,185,129,.10)}.opt.mok .kk{background:var(--green);color:#fff}
.opt.mno{opacity:.5}
textarea{width:100%;border:1.5px solid var(--line2);border-radius:13px;padding:13px;font:inherit;font-size:14px;resize:vertical;background:#fbfcfe}
textarea:focus{outline:0;border-color:var(--vng);box-shadow:0 0 0 3px rgba(241,89,43,.12);background:#fff}
.btn{display:block;width:100%;border:0;margin-top:14px;background:linear-gradient(120deg,var(--vng),var(--vng2));color:#fff;font-weight:800;font-family:'Space Grotesk',sans-serif;font-size:15px;padding:14px;border-radius:13px;cursor:pointer;box-shadow:0 10px 24px rgba(241,89,43,.26);transition:.12s;min-height:48px}
.btn:active{transform:translateY(1px)}.btn:disabled{opacity:.6}
.fb{display:none;margin-top:13px;font-size:13.5px;font-weight:600;border-radius:12px;padding:12px 14px}
.fb.ok{color:var(--greenD);background:rgba(16,185,129,.10);border:1px solid rgba(16,185,129,.25)}
.fb.no{color:var(--gold);background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.3)}
.fb .ex{margin-top:6px;font-weight:400;color:var(--muted);font-size:12.5px;line-height:1.5}
.done{text-align:center}.done .big{font-family:'Space Grotesk',sans-serif;font-size:25px;font-weight:700;margin-bottom:6px}.muted{color:var(--muted);font-size:12.5px}
.lbcard{margin-top:14px;padding:16px}
.lbh{font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:700;margin-bottom:10px}
.lrow{display:flex;align-items:center;gap:9px;padding:7px 0;font-size:13.5px}.lrow+.lrow{border-top:1px solid var(--line)}
.lrow.me{background:rgba(0,104,255,.06);border-radius:10px;padding-left:8px;padding-right:8px;margin:0 -8px;font-weight:700}
.lmd{width:24px;text-align:center;font-size:15px;font-variant-numeric:tabular-nums;color:var(--muted)}
.lnm{flex:1;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lbar{width:70px;height:8px;border-radius:99px;background:#eef2f7;overflow:hidden;flex:none}.lbar i{display:block;height:100%;background:linear-gradient(90deg,var(--green),var(--blue))}
.lpc{width:38px;text-align:right;font-variant-numeric:tabular-nums;font-size:12px;color:var(--muted)}
.lbtn{display:block;width:100%;margin-top:13px;background:#fff;color:var(--blue);border:1.5px solid var(--line2);font-weight:700;font-family:'Space Grotesk',sans-serif;font-size:13px;padding:10px;border-radius:11px;cursor:pointer;min-height:42px}
.lbtn:disabled{opacity:.6}
@media(prefers-reduced-motion:reduce){*{transition-duration:.01ms!important}}
`;

const CLIENT_JS = `
const app=document.getElementById('app');
let i=0,xp=DATA.xp,level=DATA.level,answered=false,sel=null,correctCount=0;
function esc(s){return (s||'').replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c];});}
function header(){return '<div class="top"><div class="wm">QUEST<span>\\u2726</span></div><div class="chips"><span class="chip lvl">C\\u1EA5p '+level+'</span><span class="chip xp">'+xp+' XP</span>'+(DATA.streak?'<span class="chip fl">\\uD83D\\uDD25 '+DATA.streak+'</span>':'')+'</div></div>';}
function bar(){var pct=Math.round(i/DATA.questions.length*100);return '<div class="prog"><i style="width:'+pct+'%"></i></div><div class="pn">C\\u00E2u '+(i+1)+' / '+DATA.questions.length+'</div>';}
function sub(){if(!DATA.title)return '';var a=(DATA.attemptsLeft!=null)?' \\u00B7 c\\u00F2n '+DATA.attemptsLeft+' l\\u01B0\\u1EE3t':'';return '<div class="qsub">'+esc(DATA.title)+a+(DATA.closesAt?'<span class="dl">\\u23F0 H\\u1EA1n: '+esc(DATA.closesAt)+'</span>':'')+'</div>';}
function render(){
 answered=false;sel=null;var q=DATA.questions[i];
 var h=header()+sub()+bar()+'<div class="card"><div class="qq">'+esc(q.stem)+'</div>';
 if(q.type==='mcq'){h+='<div id="opts">'+q.options.map(function(o,k){return '<div class="opt" data-k="'+k+'"><span class="kk">'+String.fromCharCode(65+k)+'</span>'+esc(o)+'</div>';}).join('')+'</div>';}
 else{h+='<textarea id="ta" rows="4" placeholder="Nh\\u1EADp c\\u00E2u tr\\u1EA3 l\\u1EDDi\\u2026"></textarea>';}
 h+='<div class="fb" id="fb"></div><button class="btn" id="go">Tr\\u1EA3 l\\u1EDDi</button></div>';
 app.innerHTML=h;
 if(q.type==='mcq'){Array.prototype.forEach.call(app.querySelectorAll('.opt'),function(o){o.onclick=function(){if(answered)return;Array.prototype.forEach.call(app.querySelectorAll('.opt'),function(x){x.classList.remove('sel');});o.classList.add('sel');sel=+o.getAttribute('data-k');};});}
 document.getElementById('go').onclick=onGo;
}
async function onGo(){
 var q=DATA.questions[i],go=document.getElementById('go');
 if(!answered){
  var answer;
  if(q.type==='mcq'){if(sel===null)return;answer=q.options[sel];}else{answer=document.getElementById('ta').value.trim();if(!answer)return;}
  go.textContent='\\u0110ang ch\\u1EA5m\\u2026';go.disabled=true;
  var r;try{r=await (await fetch('/api/answer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:DATA.token,questionId:q.id,answer:answer})})).json();}catch(e){r={ok:false};}
  go.disabled=false;
  if(!r.ok){go.textContent='Th\\u1EED l\\u1EA1i';return;}
  answered=true;xp=r.xp;level=r.level;if(r.correct)correctCount++;
  var fb=document.getElementById('fb');fb.style.display='block';fb.className='fb '+(r.correct?'ok':'no');
  fb.innerHTML=(r.correct?('\\u2705 Ch\\u00EDnh x\\u00E1c!'+(r.xpGain?' +'+r.xpGain+' XP':'')):'\\u274C Ch\\u01B0a \\u0111\\u00FAng. \\u0110\\u00E1p \\u00E1n: <b>'+esc(r.answer)+'</b>')+(r.feedback?'<br>'+esc(r.feedback):'')+(r.explanation?'<div class="ex">'+esc(r.explanation)+'</div>':'');
  if(q.type==='mcq'){Array.prototype.forEach.call(app.querySelectorAll('.opt'),function(o,k){if(q.options[k]===r.answer)o.classList.add('mok');else if(k===sel)o.classList.add('mno');});}
  var lv=app.querySelector('.lvl'),xc=app.querySelector('.xp');if(lv)lv.textContent='C\\u1EA5p '+level;if(xc)xc.textContent=xp+' XP';
  go.textContent=(i+1<DATA.questions.length)?'C\\u00E2u ti\\u1EBFp theo \\u2192':'Ho\\u00E0n th\\u00E0nh \\uD83C\\uDF89';
 } else { i++; if(i>=DATA.questions.length)done(); else render(); }
}
function lb(){
 if(!DATA.leaderboard||!DATA.leaderboard.length)return '';
 var rows=DATA.leaderboard.map(function(e){
  var md=e.rank===1?'\\uD83E\\uDD47':e.rank===2?'\\uD83E\\uDD48':e.rank===3?'\\uD83E\\uDD49':e.rank+'.';
  return '<div class="lrow'+(e.you?' me':'')+'"><span class="lmd">'+md+'</span><span class="lnm">'+esc(e.name)+'</span><div class="lbar"><i style="width:'+e.mastery+'%"></i></div><span class="lpc">'+e.mastery+'%</span></div>';
 }).join('');
 var btn='<button class="lbtn" id="lbtoggle">'+(DATA.optedIn?'\\uD83D\\uDE48 \\u1EA8n t\\u00EAn c\\u1EE7a t\\u00F4i':'\\uD83D\\uDC41 Hi\\u1EC7n t\\u00EAn c\\u1EE7a t\\u00F4i tr\\u00EAn b\\u1EA3ng')+'</button>';
 return '<div class="card lbcard"><div class="lbh">\\uD83C\\uDFC6 B\\u1EA3ng x\\u1EBFp h\\u1EA1ng</div>'+rows+btn+'</div>';
}
function wireLb(){var b=document.getElementById('lbtoggle');if(!b)return;b.onclick=async function(){b.disabled=true;
 try{await fetch('/api/leaderboard/optin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:DATA.token,on:!DATA.optedIn})});location.reload();}catch(e){b.disabled=false;}};}
async function done(){
 var streak=DATA.streak;
 try{var r=await (await fetch('/api/quest/complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:DATA.token})})).json();if(r&&r.ok&&r.streak)streak=r.streak;}catch(e){}
 var redo=DATA.redoable?'<button class="btn" style="margin-top:14px" onclick="location.reload()">\\uD83D\\uDD01 L\\u00E0m l\\u1EA1i</button>':'';
 app.innerHTML=header()+'<div class="card done"><div class="big">\\uD83C\\uDF89 Ho\\u00E0n th\\u00E0nh!</div><p>B\\u1EA1n tr\\u1EA3 l\\u1EDDi \\u0111\\u00FAng '+correctCount+'/'+DATA.questions.length+' c\\u00E2u.</p><div class="chips" style="justify-content:center"><span class="chip lvl">C\\u1EA5p '+level+'</span><span class="chip xp">'+xp+' XP</span>'+(streak?'<span class="chip fl">\\uD83D\\uDD25 '+streak+'</span>':'')+'</div>'+redo+'<p class="muted" style="margin-top:10px">Quay l\\u1EA1i m\\u1ED7i ng\\u00E0y \\u0111\\u1EC3 gi\\u1EEF chu\\u1ED7i \\uD83D\\uDD25</p></div>'+lb();
 wireLb();
}
function masteredScreen(){app.innerHTML=header()+'<div class="card done"><div class="big">🎉 Tuyệt vời!</div><p>Bạn đã thành thạo toàn bộ nhiệm vụ hiện tại.</p><p class="muted">Quay lại khi Người dẫn đường thêm nội dung mới nhé 🔔</p></div>'+lb();wireLb();}
if(DATA.questions.length){render();}else{masteredScreen();}
`;

export function renderQuest(
  course: CoursePack,
  member: { engagement?: Record<string, number> },
  token: string,
  meta: {
    title?: string; closesAt?: string | null; redoable?: boolean; attemptsLeft?: number | null;
    leaderboard?: { rank: number; name: string; mastery: number; you: boolean }[]; optedIn?: boolean;
  } = {},
): string {
  const eng = member.engagement || {};
  const qs = course.questions.map((q) => ({ id: q.id, conceptId: q.conceptId, type: q.type, stem: q.stem, options: q.options || [] }));
  const data = JSON.stringify({
    token,
    title: meta.title || course.title,
    closesAt: meta.closesAt || null,
    redoable: meta.redoable !== false,
    attemptsLeft: meta.attemptsLeft ?? null,
    xp: eng.xp || 0, level: eng.level || 1, streak: eng.streak || 0,
    leaderboard: meta.leaderboard || [], optedIn: !!meta.optedIn,
    questions: qs,
  }).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="vi"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${course.title} — Quest</title><style>${CSS}</style></head>
<body><div id="app"></div><script>const DATA=${data};</script><script>${CLIENT_JS}</script></body></html>`;
}

export function renderExpired(): string {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Quest</title>
<style>@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;600&display=swap');
body{font-family:'Inter',system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0;background:radial-gradient(720px 420px at 0% -8%,rgba(16,185,129,.10),transparent 60%),radial-gradient(720px 420px at 100% -2%,rgba(0,104,255,.10),transparent 60%),#f6f8fc;color:#16212e;text-align:center;padding:24px}
h2{font-family:'Space Grotesk',sans-serif;margin:10px 0 6px}p{color:#54616f}</style></head>
<body><div><div style="font-size:44px">⏳</div><h2>Liên kết đã hết hạn</h2><p>Hãy mở nhiệm vụ mới nhất Quest gửi cho bạn trên Zalo nhé.</p></div></body></html>`;
}

// Friendly "can't open right now" screen for the quest lifecycle gate (vs. an invalid token).
export function renderNotice(reason: string, info = ''): string {
  const map: Record<string, { e: string; t: string; m: string }> = {
    inactive: { e: '⏸️', t: 'Nhiệm vụ đang tạm tắt', m: 'Người dẫn đường đã tạm tắt nhiệm vụ này. Quay lại sau nhé.' },
    not_open: { e: '⏳', t: 'Nhiệm vụ chưa mở', m: info ? `Nhiệm vụ sẽ mở vào ${info}.` : 'Nhiệm vụ sắp mở — quay lại sau nhé.' },
    closed: { e: '🔒', t: 'Nhiệm vụ đã đóng', m: info ? `Đã hết hạn lúc ${info}.` : 'Nhiệm vụ này đã hết hạn.' },
    done_no_redo: { e: '✅', t: 'Bạn đã hoàn thành', m: 'Nhiệm vụ này không cho làm lại. Chờ nhiệm vụ mới nhé!' },
    no_attempts: { e: '✅', t: 'Đã hết lượt làm', m: 'Bạn đã dùng hết số lượt cho nhiệm vụ này.' },
  };
  const n = map[reason] || { e: '⏳', t: 'Không khả dụng', m: 'Hãy mở nhiệm vụ mới nhất Quest gửi cho bạn trên Zalo.' };
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Quest</title>
<style>@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;600&display=swap');
body{font-family:'Inter',system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0;background:radial-gradient(720px 420px at 0% -8%,rgba(16,185,129,.10),transparent 60%),radial-gradient(720px 420px at 100% -2%,rgba(0,104,255,.10),transparent 60%),#f6f8fc;color:#16212e;text-align:center;padding:24px}
h2{font-family:'Space Grotesk',sans-serif;margin:10px 0 6px}p{color:#54616f;max-width:30em}</style></head>
<body><div><div style="font-size:44px">${n.e}</div><h2>${n.t}</h2><p>${n.m}</p></div></body></html>`;
}
