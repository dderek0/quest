import type { ClassAgg } from '../skills/analytics';
import { renderPage, topbar } from './ui';

const esc = (s: string) => (s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
const pct = (n: number) => Math.round((n || 0) * 100);
const barColor = (p: number) => (p < 0.4 ? '#f1592b' : p < 0.7 ? '#f59e0b' : '#10b981');

export type BoardOpts = { visibility?: string; inviteCode?: string; waitlist?: { id: string; name: string; role?: string }[] };

const CSS = `
.sub{font-size:13.5px;margin:2px 2px 10px;color:var(--muted)}.sub b{color:var(--ink)}
.vis{cursor:pointer;font-weight:600;background:#fff;border:1px solid var(--line2);border-radius:99px;padding:3px 10px;font-size:12px;white-space:nowrap}
.invrow{margin:0 0 14px}
.kpis{display:flex;gap:8px;margin-bottom:14px}
.kpi{flex:1;background:#fff;border:1px solid var(--line);border-radius:14px;padding:11px 6px;text-align:center;box-shadow:var(--soft)}
.kpi b{display:block;font-family:'Space Grotesk',sans-serif;font-size:21px;font-variant-numeric:tabular-nums}.kpi span{font-size:10.5px;color:var(--muted)}
.whead{background:linear-gradient(120deg,#fff4ed,#ffe9dd)!important;color:var(--ink)!important;border-bottom:1px solid var(--line)!important}
.wrow{display:flex;align-items:center;gap:10px;padding:11px 16px;border-top:1px solid var(--line);font-size:13.5px}
.wrow .wn{flex:1;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.top2{display:flex;align-items:center;gap:14px;padding:15px 16px}
.top2 svg{width:92px;height:92px;flex:none}.top2 .rl{flex:1}
.stack{display:flex;height:14px;border-radius:99px;overflow:hidden;background:#eef2f7;margin:0 0 9px}.stack i{display:block;height:100%}
.leg{display:flex;gap:13px;flex-wrap:wrap;font-size:11.5px;color:var(--muted);font-variant-numeric:tabular-nums}
.dot{display:inline-block;width:8px;height:8px;border-radius:99px;margin-right:5px;vertical-align:middle}
.sec{padding:12px 16px 2px;font-size:10.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--dim);border-top:1px solid var(--line);margin-top:2px}
.crow{display:flex;align-items:center;gap:10px;padding:6px 16px;font-size:13px}
.cn{width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#33414f}
.cbar{flex:1;height:9px;border-radius:99px;background:#eef2f7;overflow:hidden}.cbar i{display:block;height:100%}
.cv{width:40px;text-align:right;font-variant-numeric:tabular-nums;font-size:12px;color:var(--muted)}
.row{display:flex;align-items:center;gap:10px;padding:9px 16px}
.nm{width:78px;font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.qc{font-size:11px;color:var(--dim);width:34px;text-align:right;font-variant-numeric:tabular-nums}
.st{font-size:11px;font-weight:600;padding:3px 9px;border-radius:99px;white-space:nowrap}
.st.ok{background:rgba(16,185,129,.12);color:var(--greenD)}.st.warn{background:rgba(241,89,43,.12);color:var(--vng)}.st.none{background:rgba(138,150,164,.14);color:var(--dim)}
.empty{padding:16px;color:var(--muted);font-size:13px}
.ask{display:flex;gap:8px;padding:13px 14px}
.ask input{flex:1}
.ans{margin:14px;font-size:13.5px;color:#33414f;border-left:3px solid var(--vng);padding:10px 12px;background:#fafbfd;border-radius:8px;white-space:pre-wrap;line-height:1.55}
.ans.insight{border-left-color:var(--blue)}
.qarow{display:flex;gap:7px;flex-wrap:wrap;padding:0 14px 13px}
.qa{font-size:11.5px;color:var(--muted);background:#f1f5fa;border:1px solid var(--line);border-radius:99px;padding:6px 11px;cursor:pointer}
`;

function ring(p: number): string {
  const r = 52, C = 2 * Math.PI * r, off = C * (1 - p);
  return `<svg viewBox="0 0 120 120" role="img" aria-label="Thành thạo trung bình ${pct(p)}%">
    <defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#10b981"/><stop offset="1" stop-color="#0068ff"/></linearGradient></defs>
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="#eef2f7" stroke-width="12"/>
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="url(#rg)" stroke-width="12" stroke-linecap="round"
      stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 60 60)"/>
    <text x="60" y="58" text-anchor="middle" font-size="26" font-weight="800" font-family="'Space Grotesk',sans-serif" fill="#16212e">${pct(p)}<tspan font-size="13">%</tspan></text>
    <text x="60" y="76" text-anchor="middle" font-size="10" fill="#8a96a4">thành thạo</text>
  </svg>`;
}

export function renderBoard(className: string, agg: ClassAgg, insight: string, token: string, opts: BoardOpts = {}): string {
  const n = agg.total.members || 1;
  const avg = agg.members.length ? agg.members.reduce((s, m) => s + m.avgMastery, 0) / agg.members.length : 0;
  const w = (c: number) => `${(c / n) * 100}%`;
  const isPublic = opts.visibility === 'public';
  const inviteCode = opts.inviteCode;
  const waitlist = opts.waitlist || [];

  const chip = (s: string) =>
    s === 'on_track' ? '<span class="st ok">Theo kịp</span>'
    : s === 'behind' ? '<span class="st warn">Tụt lại</span>'
    : '<span class="st none">Chưa bắt đầu</span>';

  const conceptRows = [...agg.concepts].sort((a, b) => a.avgMastery - b.avgMastery).map((c) =>
    `<div class="crow"><span class="cn">${esc(c.name)}</span><div class="cbar"><i style="width:${pct(c.avgMastery)}%;background:${barColor(c.avgMastery)}"></i></div><span class="cv num">${pct(c.avgMastery)}%</span></div>`,
  ).join('') || '<div class="empty">Chưa có dữ liệu khái niệm.</div>';

  const memberRows = agg.members.length ? agg.members.map((m) =>
    `<div class="row"><span class="nm">${esc(m.name)}</span><div class="bar"><i style="width:${pct(m.avgMastery)}%"></i></div><span class="qc num">${m.answered}c</span>${chip(m.status)}</div>`,
  ).join('') : '<div class="empty">Chưa có học viên nào tham gia.</div>';

  const waitlistCard = waitlist.length ? `
  <details class="card" open>
    <summary class="chead whead">⏳ Chờ duyệt (${waitlist.length})<small>Học viên đang đợi bạn cho vào lớp</small></summary>
    ${waitlist.map((m) => `<div class="wrow"><span class="wn">${esc(m.name)}${m.role ? ` · <span class="dim">${esc(m.role)}</span>` : ''}</span><button class="btn ok sm appr" data-m="${esc(m.id)}">Duyệt</button></div>`).join('')}
  </details>` : '';

  const body = `
  ${topbar(`<a class="btn ghost sm" href="/manage/${token}">📂 Quản lý</a>`)}
  <div class="sub">📋 Bảng điều khiển · <b>${esc(className)}</b> · <span class="vis" id="vis" data-v="${isPublic ? 'public' : 'private'}">${isPublic ? '🌐 Công khai' : '🔒 Riêng tư'}</span></div>
  ${inviteCode ? `<div class="invrow"><span class="codechip">🎟 Mã mời: <b id="inv">${esc(inviteCode)}</b><button class="cp" id="cpinv">chép</button></span></div>` : ''}

  <div class="kpis">
    <div class="kpi"><b>${agg.total.members}</b><span>học viên</span></div>
    <div class="kpi"><b style="color:#059669">${agg.total.onTrack}</b><span>theo kịp</span></div>
    <div class="kpi"><b style="color:#f1592b">${agg.total.behind}</b><span>tụt lại</span></div>
    <div class="kpi"><b style="color:#8a96a4">${agg.total.notStarted}</b><span>chưa BĐ</span></div>
  </div>

  ${waitlistCard}

  <details class="card" open>
    <summary class="chead">📊 Số liệu lớp học<small>Tổng quan tiến độ &amp; điểm yếu chung</small></summary>
    <div class="top2">
      ${ring(avg)}
      <div class="rl">
        <div class="stack">
          <i style="width:${w(agg.total.onTrack)};background:#10b981"></i>
          <i style="width:${w(agg.total.behind)};background:#f1592b"></i>
          <i style="width:${w(agg.total.notStarted)};background:#cbd5e1"></i>
        </div>
        <div class="leg">
          <span><i class="dot" style="background:#10b981"></i>Theo kịp ${agg.total.onTrack}</span>
          <span><i class="dot" style="background:#f1592b"></i>Tụt lại ${agg.total.behind}</span>
          <span><i class="dot" style="background:#cbd5e1"></i>Chưa BĐ ${agg.total.notStarted}</span>
        </div>
      </div>
    </div>
    <div class="sec">Thành thạo theo khái niệm · yếu nhất trên cùng</div>
    ${conceptRows}
    <div class="sec">Học viên</div>
    ${memberRows}
  </details>

  <details class="card" open>
    <summary class="chead dark">🤖 Báo cáo AI<small>Tóm tắt tự động · hỏi đáp về lớp bằng ngôn ngữ tự nhiên</small></summary>
    <div class="ans insight" id="insight">${esc(insight)}</div>
    <div class="ask"><input type="text" id="q" placeholder="vd: ai đang tụt lại? khái niệm nào cần dạy lại?"><button class="btn primary" id="go">Hỏi</button></div>
    <div class="qarow">
      <span class="qa" data-q="Ai cần chú ý nhất và vì sao?">Ai cần chú ý?</span>
      <span class="qa" data-q="Khái niệm nào cả lớp đang yếu nhất?">Khái niệm yếu nhất?</span>
      <span class="qa" data-q="Ai chưa bắt đầu học?">Ai chưa bắt đầu?</span>
    </div>
    <div class="ans hidden" id="ans"></div>
  </details>`;

  const scripts = `<script>const TOKEN=${JSON.stringify(token)};
    var ci=document.getElementById('cpinv');if(ci){ci.onclick=function(){navigator.clipboard&&navigator.clipboard.writeText(document.getElementById('inv').textContent);ci.textContent='✓';setTimeout(function(){ci.textContent='chép';},1000);};}
    var go=document.getElementById('go'),q=document.getElementById('q'),ans=document.getElementById('ans');
    async function ask(){var question=q.value.trim();if(!question)return;go.disabled=true;go.textContent='…';
      ans.classList.remove('hidden');ans.textContent='Đang phân tích…';
      try{var r=await (await fetch('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:TOKEN,question:question})})).json();ans.textContent=r.answer||'(không có trả lời)';}
      catch(e){ans.textContent='Lỗi kết nối.';}
      go.disabled=false;go.textContent='Hỏi';}
    go.onclick=ask;q.addEventListener('keydown',function(e){if(e.key==='Enter')ask();});
    document.querySelectorAll('.qa').forEach(function(c){c.onclick=function(){q.value=c.getAttribute('data-q');ask();};});
    document.querySelectorAll('.appr').forEach(function(b){b.onclick=async function(){b.disabled=true;b.textContent='…';
      try{var r=await (await fetch('/api/approve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:TOKEN,memberId:b.getAttribute('data-m')})})).json();
        if(r.ok){location.reload();}else{b.disabled=false;b.textContent='Duyệt';}}catch(e){b.disabled=false;b.textContent='Duyệt';}};});
    var vis=document.getElementById('vis');if(vis){vis.onclick=async function(){var nv=vis.getAttribute('data-v')==='public'?'private':'public';
      try{var r=await (await fetch('/api/visibility',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:TOKEN,visibility:nv})})).json();if(r.ok)location.reload();}catch(e){}};}
  </script>`;

  return renderPage({ title: `Bảng điều khiển — ${esc(className)}`, body, css: CSS, scripts, max: 560 });
}
