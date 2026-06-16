import { renderPage, topbar } from './ui';

const esc = (s: string) => (s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));

export type AdminData = {
  token: string;
  totals: { classes: number; members: number; quests: number; materials: number; events: number };
  classes: { id: string; name: string; owner?: string; visibility: string; members: number; quests: number; materials: number; inviteCode?: string; manageUrl: string; boardUrl: string }[];
};

const CSS = `
.tag{font-family:'Space Grotesk',sans-serif;font-size:11px;font-weight:700;color:#fff;background:#0d1320;border-radius:8px;padding:4px 9px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:8px;margin:6px 0 16px}
.kpi{background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px 8px;text-align:center;box-shadow:var(--soft)}
.kpi b{display:block;font-family:'Space Grotesk',sans-serif;font-size:22px;font-variant-numeric:tabular-nums}
.kpi span{font-size:10.5px;color:var(--muted)}
.cls{background:#fff;border:1px solid var(--line);border-radius:16px;box-shadow:var(--soft);padding:14px;margin-bottom:11px}
.clsh{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.cn{flex:1;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.owner{font-size:12.5px;color:var(--muted);margin:-4px 0 9px}.owner b{color:var(--ink)}
.owner.none{color:var(--dim)}
.vchip{font-size:11px;font-weight:600;padding:3px 9px;border-radius:99px;white-space:nowrap}
.vchip.pub{background:rgba(0,104,255,.10);color:var(--blue)} .vchip.priv{background:rgba(138,150,164,.16);color:var(--muted)}
.stat{font-size:12.5px;color:var(--muted);font-variant-numeric:tabular-nums;margin-bottom:11px;display:flex;gap:10px;flex-wrap:wrap}
.stat b{color:var(--ink);font-weight:700}
.acts{display:flex;gap:8px;flex-wrap:wrap}
.acts .btn{flex:1;min-width:90px}
.del{background:#fdecea;color:var(--vng);border:1px solid rgba(241,89,43,.3);flex:0 0 auto!important;min-width:auto!important}
.empty{color:var(--muted);font-size:14px;text-align:center;padding:24px}
`;

export function renderAdmin(d: AdminData): string {
  const t = d.totals;
  const rows = d.classes.length ? d.classes.map((c) => {
    const pub = c.visibility === 'public';
    return `<div class="cls">
      <div class="clsh"><span class="cn">${esc(c.name)}</span><span class="vchip ${pub ? 'pub' : 'priv'}">${pub ? '🌐 Công khai' : '🔒 Riêng tư'}</span></div>
      <div class="owner${c.owner ? '' : ' none'}">👤 Chủ lớp: <b>${c.owner ? esc(c.owner) : '(chưa liên kết Zalo)'}</b></div>
      <div class="stat"><span>👥 <b>${c.members}</b> học viên</span><span>⚔️ <b>${c.quests}</b> nhiệm vụ</span><span>📄 <b>${c.materials}</b> tài liệu</span>${c.inviteCode ? `<span>🎟 ${esc(c.inviteCode)}</span>` : ''}</div>
      <div class="acts">
        <a class="btn ghost sm" href="${c.manageUrl}" target="_blank">📂 Quản lý</a>
        <a class="btn dark sm" href="${c.boardUrl}" target="_blank">📋 Bảng</a>
        <button class="btn sm del" data-id="${esc(c.id)}" data-name="${esc(c.name)}">Xoá</button>
      </div>
    </div>`;
  }).join('') : '<div class="empty">Chưa có lớp nào.</div>';

  const body = `
  ${topbar('<span class="tag">ADMIN</span>')}
  <div class="kpis">
    <div class="kpi"><b>${t.classes}</b><span>lớp</span></div>
    <div class="kpi"><b>${t.members}</b><span>học viên</span></div>
    <div class="kpi"><b>${t.quests}</b><span>nhiệm vụ</span></div>
    <div class="kpi"><b>${t.materials}</b><span>tài liệu</span></div>
    <div class="kpi"><b>${t.events}</b><span>lượt trả lời</span></div>
  </div>
  ${rows}`;

  const scripts = `<script>const TOKEN=${JSON.stringify(d.token)};
    document.querySelectorAll('.del').forEach(function(b){b.onclick=async function(){
      if(!confirm('Xoá lớp "'+b.getAttribute('data-name')+'"? Toàn bộ học viên, nhiệm vụ, tài liệu sẽ bị xoá.'))return;
      b.disabled=true;b.textContent='…';
      try{var r=await (await fetch('/api/admin/delete-class',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({t:TOKEN,classId:b.getAttribute('data-id')})})).json();
        if(r.ok)location.reload();else{b.disabled=false;b.textContent='Xoá';alert(r.error||'Lỗi');}}
      catch(e){b.disabled=false;b.textContent='Xoá';}};});
  </script>`;

  return renderPage({ title: 'Admin — Quest', body, css: CSS, scripts, max: 640 });
}

export function renderAdminGate(): string {
  const body = `
  ${topbar('<span class="tag">ADMIN</span>')}
  <div class="card pad" style="margin-top:20px;text-align:center">
    <div style="font-size:42px">🛡️</div>
    <h2 style="font-family:'Space Grotesk',sans-serif;margin:8px 0 4px">Khu vực quản trị</h2>
    <p class="muted" style="font-size:13.5px;margin:0;line-height:1.6">Chỉ chủ sở hữu mới truy cập được.<br>Mở bot <b>Quest</b> trên Zalo và gửi <b>admin</b> để nhận liên kết (hết hạn sau 1 giờ).</p>
  </div>`;
  return renderPage({ title: 'Admin — Quest', body, css: `.tag{font-family:'Space Grotesk',sans-serif;font-size:11px;font-weight:700;color:#fff;background:#0d1320;border-radius:8px;padding:4px 9px}`, max: 420 });
}
