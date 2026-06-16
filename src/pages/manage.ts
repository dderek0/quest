import { renderPage, topbar } from './ui';
import { config } from '../config';

// GET /manage/:token — Coach class management: roster (members + approvals), Materials, Quests.
const esc = (s: string) => (s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
const fmtVN = (iso: string | null) => { if (!iso) return ''; try { return new Date(iso).toLocaleString('vi-VN', { timeZone: config.TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
// Live status of a quest, from its active flag + time window.
function qStatus(qq: ManageData['quests'][number]): { k: string; label: string } {
  if (!qq.active) return { k: 'off', label: 'Đã tắt' };
  const now = Date.now();
  if (qq.opensAt && new Date(qq.opensAt).getTime() > now) return { k: 'sched', label: 'Hẹn giờ' };
  if (qq.closesAt && new Date(qq.closesAt).getTime() < now) return { k: 'closed', label: 'Đã đóng' };
  return { k: 'live', label: '● Đang giao' };
}

export type ManageData = {
  token: string;
  className: string;
  inviteCode?: string;
  activeQuestId: string | null;
  materials: { id: string; title: string; chars: number }[];
  quests: {
    id: string; title: string; concepts: number; questions: number; materialIds: string[];
    active: boolean; redoable: boolean; maxAttempts: number; opensAt: string | null; closesAt: string | null;
    completed: number;
  }[];
  members: { name: string; role?: string }[];
  waitlist: { id: string; name: string; role?: string }[];
};

const CSS = `
.sub{font-size:13.5px;margin:2px 2px 10px;color:var(--muted)}.sub b{color:var(--ink)}
.invrow{margin:0 0 12px}
.statbar{display:flex;gap:8px;margin:0 0 16px}
.stat1{flex:1;background:#fff;border:1px solid var(--line);border-radius:13px;padding:10px 6px;text-align:center;box-shadow:var(--soft)}
.stat1 b{display:block;font-family:'Space Grotesk',sans-serif;font-size:19px;font-variant-numeric:tabular-nums}.stat1 span{font-size:10.5px;color:var(--muted)}
.wsub{padding:11px 16px 4px;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--vng)}
.wrow{display:flex;align-items:center;gap:10px;padding:9px 16px;border-top:1px solid var(--line);font-size:14px}
.wrow .wn{flex:1;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.arow{display:flex;align-items:center;gap:10px;padding:11px 16px;border-top:1px solid var(--line);font-size:14px}
.arow .an{flex:1;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.arow .arole{font-size:11.5px;color:var(--dim)}
.up{display:flex;gap:8px;align-items:center;margin-bottom:10px}
.up input[type=file]{flex:1;min-width:0}
.orsep{text-align:center;color:var(--dim);font-size:11.5px;margin:2px 0 10px}
.mrow{display:flex;align-items:center;gap:11px;padding:11px 16px;border-top:1px solid var(--line)}
.mrow input[type=checkbox]{width:18px;height:18px;flex:none;accent-color:var(--vng)}
.mrow .t{flex:1;font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mrow .c{font-size:11px;color:var(--dim);font-variant-numeric:tabular-nums}
.qrow{padding:12px 16px;border-top:1px solid var(--line)}
.qhd{display:flex;align-items:flex-start;gap:10px}
.qrow .t{flex:1;min-width:0}.qrow .qt{font-family:'Space Grotesk',sans-serif;font-size:14px;font-weight:700}
.qrow .qm{font-size:11.5px;color:var(--muted);margin-top:3px;font-variant-numeric:tabular-nums;line-height:1.5}
.qpill{font-size:10px;font-weight:700;padding:4px 9px;border-radius:99px;white-space:nowrap;flex:none}
.qpill.live{background:rgba(16,185,129,.13);color:var(--greenD)}
.qpill.off{background:#eef2f7;color:var(--dim)}
.qpill.sched{background:rgba(0,104,255,.10);color:var(--blue)}
.qpill.closed{background:rgba(241,89,43,.10);color:var(--vng)}
.qdone{font-weight:700}
.qdone.all{color:var(--greenD)}
.qdone.some{color:var(--ink)}
.qdone.none{color:var(--dim)}
.qact{display:flex;flex-wrap:wrap;gap:7px;margin-top:11px}
.qact .btn{flex:1;min-width:96px}
.qset{margin-top:11px;padding:12px;border:1px dashed var(--line2);border-radius:12px;background:#fbfcfe}
.qset .ck{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:600;margin-bottom:4px}
.qset .ck input{width:18px;height:18px;accent-color:var(--vng)}
.qset .field{margin:10px 0 5px}
.qset input[type=number],.qset input[type=datetime-local]{margin-bottom:2px}
.badge{font-size:10.5px;font-weight:700;background:rgba(16,185,129,.13);color:var(--greenD);padding:4px 10px;border-radius:99px;white-space:nowrap}
.empty{padding:14px 16px;color:var(--muted);font-size:13px}
.hint{font-size:11.5px;color:var(--dim);margin:8px 2px 0;line-height:1.5}
`;

export function renderManage(d: ManageData): string {
  const waitlistBlock = d.waitlist.length
    ? `<div class="wsub">⏳ Chờ duyệt (${d.waitlist.length})</div>` + d.waitlist.map((m) =>
        `<div class="wrow"><span class="wn">${esc(m.name)}${m.role ? ` · <span class="dim">${esc(m.role)}</span>` : ''}</span><button class="btn ok sm appr" data-m="${esc(m.id)}">Duyệt</button></div>`).join('')
    : '';
  const memberBlock = d.members.length
    ? d.members.map((m) => `<div class="arow"><span class="an">${esc(m.name)}</span>${m.role ? `<span class="arole">${esc(m.role)}</span>` : ''}</div>`).join('')
    : (d.waitlist.length ? '' : '<div class="empty">Chưa có học viên. Chia sẻ mã mời để mọi người vào lớp.</div>');

  const materialRows = d.materials.length
    ? d.materials.map((m) => `<div class="mrow"><input type="checkbox" class="mat" value="${esc(m.id)}"><span class="t">${esc(m.title)}</span><span class="c">${(m.chars || 0).toLocaleString('vi-VN')} ký tự</span></div>`).join('')
    : '<div class="empty">Chưa có tài liệu. Thêm tài liệu đầu tiên ở trên 👆</div>';

  const questRows = d.quests.length
    ? d.quests.map((qq) => {
        const st = qStatus(qq);
        const total = d.members.length;
        const doneClass = total > 0 && qq.completed >= total ? 'all' : qq.completed > 0 ? 'some' : 'none';
        const doneLine = `<span class="qdone ${doneClass}">✅ ${qq.completed}/${total} đã hoàn thành</span>`;
        const summary = `${qq.concepts} khái niệm · ${qq.questions} câu · ${qq.materialIds.length} tài liệu`;
        const cfg = `${qq.redoable ? 'làm lại ✓' : 'không làm lại'}${qq.maxAttempts ? ` · ${qq.maxAttempts} lượt` : ''}${qq.closesAt ? ` · hạn ${fmtVN(qq.closesAt)}` : ''}`;
        const actions = qq.active
          ? `<button class="btn ok sm qremind" data-q="${esc(qq.id)}">🔔 Nhắc chưa xong</button><button class="btn ghost sm rsend" data-q="${esc(qq.id)}">📣 Gửi cả lớp</button><button class="btn ghost sm qoff" data-q="${esc(qq.id)}">⏸ Tắt</button>`
          : `<button class="btn ok sm qon" data-q="${esc(qq.id)}">📣 Giao &amp; gửi</button>`;
        return `<div class="qrow">
          <div class="qhd"><div class="t"><div class="qt">${esc(qq.title)}</div><div class="qm">${summary}<br>${cfg}<br>${doneLine}</div></div><span class="qpill ${st.k}">${st.label}</span></div>
          <div class="qact">${actions}<button class="btn ghost sm qcfg" data-q="${esc(qq.id)}">⚙ Cài đặt</button></div>
          <div class="qset" id="set_${esc(qq.id)}" hidden>
            <label class="ck"><input type="checkbox" class="cf-redo"${qq.redoable ? ' checked' : ''}> Cho làm lại nhiều lần</label>
            <label class="field">Số lượt tối đa <span class="dim">(0 = không giới hạn)</span></label>
            <input type="number" class="cf-max" min="0" value="${qq.maxAttempts || 0}">
            <label class="field">Mở lúc <span class="dim">(tuỳ chọn)</span></label>
            <input type="datetime-local" class="cf-open" data-iso="${esc(qq.opensAt || '')}">
            <label class="field">Hạn chót <span class="dim">(tuỳ chọn)</span></label>
            <input type="datetime-local" class="cf-close" data-iso="${esc(qq.closesAt || '')}">
            <button class="btn primary sm cf-save" data-q="${esc(qq.id)}" style="margin-top:10px">Lưu cài đặt</button>
          </div>
        </div>`;
      }).join('')
    : '<div class="empty">Chưa có nhiệm vụ. Chọn tài liệu bên dưới rồi bấm "Tạo nhiệm vụ".</div>';

  const body = `
  ${topbar(`<a class="btn dark sm" href="/board/${esc(d.token)}">📋 Bảng</a>`)}
  <div class="sub">📂 Quản lý lớp · <b>${esc(d.className)}</b></div>
  ${d.inviteCode ? `<div class="invrow"><span class="codechip">🎟 Mã mời: <b id="inv">${esc(d.inviteCode)}</b><button class="cp" id="cpinv">chép</button></span></div>` : ''}

  <div class="statbar">
    <div class="stat1"><b>${d.members.length}</b><span>học viên</span></div>
    <div class="stat1"><b style="color:#f1592b">${d.waitlist.length}</b><span>chờ duyệt</span></div>
    <div class="stat1"><b>${d.materials.length}</b><span>tài liệu</span></div>
    <div class="stat1"><b>${d.quests.length}</b><span>nhiệm vụ</span></div>
  </div>

  <details class="card" open>
    <summary class="chead">👥 Học viên (${d.members.length})<small>Duyệt yêu cầu &amp; xem danh sách lớp</small></summary>
    ${waitlistBlock}
    ${memberBlock}
  </details>

  <details class="card" open>
    <summary class="chead">📄 Tài liệu<small>Thư viện tài liệu — chọn để tạo nhiệm vụ</small></summary>
    <div class="cbody">
      <label class="field">Thêm tài liệu</label>
      <input type="text" id="mtitle" placeholder="Tiêu đề (tuỳ chọn — mặc định lấy tên tệp)" style="margin-bottom:10px">
      <div class="up"><input type="file" id="mfile" accept=".pdf,.docx,.txt,.md,.csv"><button class="btn primary" id="upbtn">📎 Tải lên tệp</button></div>
      <div class="orsep">— hoặc dán nội dung —</div>
      <textarea id="mcontent" placeholder="Dán nội dung tài liệu…"></textarea>
      <button class="btn ghost block" id="addmat" style="margin-top:10px">+ Thêm (dán)</button>
      <div class="err" id="materr"></div>
    </div>
    ${materialRows}
  </details>

  <details class="card" open>
    <summary class="chead">⚔️ Nhiệm vụ<small>AI tạo câu hỏi từ tài liệu bạn chọn ở trên</small></summary>
    <div class="cbody">
      <label class="field">Tên nhiệm vụ (tuỳ chọn)</label>
      <input type="text" id="qname" placeholder="vd: Ôn tập bảo mật tuần 1" style="margin-bottom:12px">
      <label class="field">Yêu cầu thêm cho AI (tuỳ chọn)</label>
      <textarea id="qinstr" placeholder="vd: tập trung tình huống thực tế · tăng độ khó · nhấn mạnh bảo mật dữ liệu · dùng tiếng Việt đơn giản" style="min-height:62px;margin-bottom:12px"></textarea>
      <button class="btn ok block" id="mkquest">⚔️ Tạo nhiệm vụ từ tài liệu đã chọn</button>
      <div class="err" id="questerr"></div>
      <div class="hint">Nhiệm vụ được gửi cho học viên ngay khi tạo. Sau đó bạn có thể Tắt/Bật, gửi lại, hoặc đặt số lượt &amp; hạn chót ở mỗi nhiệm vụ bên dưới.</div>
    </div>
    ${questRows}
  </details>`;

  const scripts = `<script>const TOKEN=${JSON.stringify(d.token)};
    function err(id,msg){document.getElementById(id).textContent=msg||'';}
    var cpinv=document.getElementById('cpinv');if(cpinv)cpinv.onclick=function(){navigator.clipboard&&navigator.clipboard.writeText(document.getElementById('inv').textContent);cpinv.textContent='✓';setTimeout(function(){cpinv.textContent='chép';},1000);};
    document.querySelectorAll('.appr').forEach(function(b){b.onclick=async function(){b.disabled=true;b.textContent='…';
      try{var r=await (await fetch('/api/approve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:TOKEN,memberId:b.getAttribute('data-m')})})).json();
        if(r.ok)location.reload();else{b.disabled=false;b.textContent='Duyệt';}}catch(e){b.disabled=false;b.textContent='Duyệt';}};});
    var upbtn=document.getElementById('upbtn');
    upbtn.onclick=async function(){
      var f=document.getElementById('mfile').files[0];err('materr','');
      if(!f){err('materr','Hãy chọn một tệp (PDF, DOCX, TXT).');return;}
      var fd=new FormData();fd.append('file',f);fd.append('token',TOKEN);fd.append('title',document.getElementById('mtitle').value.trim());
      upbtn.disabled=true;upbtn.innerHTML='<span class="spin"></span>Đang xử lý…';
      try{var r=await (await fetch('/api/material/upload',{method:'POST',body:fd})).json();
        if(r.ok)location.reload();else{err('materr',r.error||'Lỗi tải tệp');upbtn.disabled=false;upbtn.textContent='📎 Tải lên tệp';}}
      catch(e){err('materr','Lỗi kết nối.');upbtn.disabled=false;upbtn.textContent='📎 Tải lên tệp';}
    };
    var addmat=document.getElementById('addmat');
    addmat.onclick=async function(){
      var title=document.getElementById('mtitle').value.trim(),content=document.getElementById('mcontent').value.trim();
      err('materr','');if(content.length<20){err('materr','Nội dung quá ngắn.');return;}
      addmat.disabled=true;addmat.textContent='Đang lưu…';
      try{var r=await (await fetch('/api/material',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:TOKEN,title:title,content:content})})).json();
        if(r.ok)location.reload();else{err('materr',r.error||'Lỗi');addmat.disabled=false;addmat.textContent='+ Thêm (dán)';}}
      catch(e){err('materr','Lỗi kết nối.');addmat.disabled=false;addmat.textContent='+ Thêm (dán)';}
    };
    var mk=document.getElementById('mkquest');
    mk.onclick=async function(){
      var ids=Array.prototype.slice.call(document.querySelectorAll('.mat:checked')).map(function(c){return c.value;});
      err('questerr','');if(!ids.length){err('questerr','Hãy chọn ít nhất một tài liệu ở mục Tài liệu.');return;}
      mk.disabled=true;mk.innerHTML='<span class="spin"></span>AI đang tạo nhiệm vụ… (~30-60s)';
      try{var r=await (await fetch('/api/quest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:TOKEN,name:document.getElementById('qname').value.trim(),materialIds:ids,instructions:document.getElementById('qinstr').value.trim()})})).json();
        if(r.ok){if(typeof r.sent==='number')alert('Đã tạo nhiệm vụ và gửi cho '+r.sent+' học viên.');location.reload();}else{err('questerr',r.error||'Lỗi tạo nhiệm vụ');mk.disabled=false;mk.textContent='⚔️ Tạo nhiệm vụ từ tài liệu đã chọn';}}
      catch(e){err('questerr','Lỗi kết nối.');mk.disabled=false;mk.textContent='⚔️ Tạo nhiệm vụ từ tài liệu đã chọn';}
    };
    function postJSON(url,body){return fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json();});}
    document.querySelectorAll('.qon').forEach(function(b){b.onclick=async function(){b.disabled=true;b.textContent='…';
      try{var r=await postJSON('/api/quest/activate',{token:TOKEN,questId:b.getAttribute('data-q')});
        if(r.ok){alert('Đã giao và gửi cho '+(r.sent||0)+' học viên.');location.reload();}else{b.disabled=false;b.textContent='📣 Giao & gửi';}}
      catch(e){b.disabled=false;b.textContent='📣 Giao & gửi';}};});
    document.querySelectorAll('.qoff').forEach(function(b){b.onclick=async function(){b.disabled=true;b.textContent='…';
      try{var r=await postJSON('/api/quest/toggle',{token:TOKEN,questId:b.getAttribute('data-q'),active:false});
        if(r.ok)location.reload();else{b.disabled=false;b.textContent='⏸ Tắt';}}catch(e){b.disabled=false;b.textContent='⏸ Tắt';}};});
    document.querySelectorAll('.rsend').forEach(function(b){b.onclick=async function(){b.disabled=true;b.textContent='…';
      try{var r=await postJSON('/api/quest/resend',{token:TOKEN,questId:b.getAttribute('data-q')});
        if(r.ok)alert('Đã gửi lại cho '+(r.sent||0)+' học viên.');}catch(e){}
      b.disabled=false;b.textContent='📣 Gửi cả lớp';};});
    document.querySelectorAll('.qremind').forEach(function(b){b.onclick=async function(){b.disabled=true;b.textContent='…';
      try{var r=await postJSON('/api/quest/remind',{token:TOKEN,questId:b.getAttribute('data-q')});
        if(r.ok)alert(r.sent?('Đã nhắc '+r.sent+' học viên chưa hoàn thành.'):'Tất cả học viên đã hoàn thành nhiệm vụ này 🎉');}catch(e){}
      b.disabled=false;b.textContent='🔔 Nhắc chưa xong';};});
    document.querySelectorAll('.qcfg').forEach(function(b){b.onclick=function(){var s=document.getElementById('set_'+b.getAttribute('data-q'));if(s)s.hidden=!s.hidden;};});
    function toLocalInput(iso){if(!iso)return '';var d=new Date(iso);if(isNaN(d.getTime()))return '';return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
    Array.prototype.forEach.call(document.querySelectorAll('.cf-open,.cf-close'),function(inp){inp.value=toLocalInput(inp.getAttribute('data-iso'));});
    document.querySelectorAll('.cf-save').forEach(function(b){b.onclick=async function(){
      var id=b.getAttribute('data-q'),box=document.getElementById('set_'+id);
      var redo=box.querySelector('.cf-redo').checked,max=parseInt(box.querySelector('.cf-max').value,10)||0;
      var ov=box.querySelector('.cf-open').value,cv=box.querySelector('.cf-close').value;
      var opensAt=ov?new Date(ov).toISOString():null,closesAt=cv?new Date(cv).toISOString():null;
      b.disabled=true;b.textContent='Đang lưu…';
      try{var r=await postJSON('/api/quest/config',{token:TOKEN,questId:id,redoable:redo,maxAttempts:max,opensAt:opensAt,closesAt:closesAt});
        if(r.ok)location.reload();else{alert(r.error||'Lỗi lưu cài đặt');b.disabled=false;b.textContent='Lưu cài đặt';}}catch(e){b.disabled=false;b.textContent='Lưu cài đặt';}};});
  </script>`;

  return renderPage({ title: `Quản lý — ${esc(d.className)}`, body, css: CSS, scripts, max: 560 });
}
