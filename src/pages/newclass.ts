import { renderPage, topbar } from './ui';

// GET /new — Coach self-serve: create an (empty) class. Materials + Quests come next on /manage.
const CSS = `
h1{font-size:22px;margin:0 0 4px;font-family:'Space Grotesk',sans-serif}
.lead{color:var(--muted);font-size:13.5px;margin:0 0 4px;line-height:1.5}
.seg{display:flex;gap:8px;margin-top:2px}
.seg label{flex:1;border:1px solid var(--line2);border-radius:11px;padding:11px;text-align:center;cursor:pointer;font-weight:700;font-size:13.5px;background:#fbfcfe;color:#33414f;font-family:'Space Grotesk',sans-serif;transition:.12s}
.seg input{display:none}
.seg label:has(input:checked){border-color:var(--vng);background:#fff4ef;color:var(--vng)}
.go{margin-top:18px}
.cl{display:block;font-size:11px;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:.06em;margin:14px 0 6px}
.codechip{width:100%;justify-content:space-between}
.cta{margin-top:10px}
.optnote{font-size:12.5px;color:var(--muted);margin-top:14px;line-height:1.55;background:#f7f9fc;border:1px solid var(--line);border-radius:11px;padding:11px 13px}
.optnote b{color:#33414f}
.ok{color:var(--greenD)}
`;

export function renderNewClass(): string {
  const body = `
  ${topbar()}
  <div class="card pad" id="form">
    <h1>Tạo lớp học mới</h1>
    <p class="lead">Tạo lớp trước — sau đó tải tài liệu và tạo nhiệm vụ trong trang quản lý.</p>
    <label class="field" for="name">Tên lớp</label>
    <input type="text" id="name" placeholder="vd: Chính sách AI tuần này" autocomplete="off">
    <label class="field">Chế độ tham gia</label>
    <div class="seg">
      <label><input type="radio" name="vis" value="private" checked>🔒 Riêng tư</label>
      <label><input type="radio" name="vis" value="public">🌐 Công khai</label>
    </div>
    <button class="btn primary block go" id="go">Tạo lớp</button>
    <div class="err hidden" id="err"></div>
  </div>

  <div class="card pad hidden" id="result">
    <h1><span class="ok">✓</span> Đã tạo lớp!</h1>
    <p class="lead" id="rmeta"></p>
    <div class="note hidden" id="boundnote">✅ Lớp đã liên kết với Zalo của bạn — liên kết quản lý đã được gửi vào bot.</div>
    <span class="cl">Mã mời học viên — chia sẻ để mọi người vào lớp</span>
    <div class="codechip"><b id="invite"></b><button class="cp" data-c="invite">Sao chép</button></div>
    <a class="btn primary block cta" id="manage" href="#" target="_blank">📂 Mở trang quản lý</a>
    <a class="btn dark block cta" id="board" href="#" target="_blank">📋 Bảng điều khiển</a>
    <div class="optnote" id="coachblock">💬 <b>Tuỳ chọn:</b> muốn nhận nhắc &amp; xem lại lớp ngay trong Zalo? Gửi mã <b id="link" class="num"></b> cho bot Quest. <button class="cp" data-c="link">chép</button></div>
  </div>`;

  const scripts = `<script>
    var go=document.getElementById('go'),err=document.getElementById('err');
    var K=new URLSearchParams(location.search).get('k')||'';
    go.onclick=async function(){
      var name=document.getElementById('name').value.trim();
      var vis=document.querySelector('input[name=vis]:checked').value;
      err.classList.add('hidden');go.disabled=true;go.textContent='Đang tạo…';
      try{
        var r=await (await fetch('/api/class',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name,visibility:vis,k:K})})).json();
        if(!r.ok)throw new Error(r.error||'Lỗi tạo lớp');
        document.getElementById('rmeta').textContent='“'+r.name+'” · '+(vis==='public'?'🌐 Công khai':'🔒 Riêng tư');
        document.getElementById('invite').textContent=r.inviteCode;
        document.getElementById('link').textContent=r.linkCode;
        document.getElementById('manage').href=r.manageUrl;
        document.getElementById('board').href=r.boardUrl;
        if(r.bound){document.getElementById('coachblock').classList.add('hidden');document.getElementById('boundnote').classList.remove('hidden');}
        document.getElementById('form').classList.add('hidden');
        document.getElementById('result').classList.remove('hidden');
      }catch(e){err.textContent=(e&&e.message)||'Lỗi tạo lớp';err.classList.remove('hidden');go.disabled=false;go.textContent='Tạo lớp';}
    };
    document.querySelectorAll('.cp').forEach(function(b){b.onclick=function(){
      var t=document.getElementById(b.getAttribute('data-c')).textContent;
      navigator.clipboard&&navigator.clipboard.writeText(t);b.textContent='Đã chép ✓';setTimeout(function(){b.textContent='Sao chép';},1200);};});
  </script>`;

  return renderPage({ title: 'Tạo lớp — Quest', body, css: CSS, scripts, max: 520 });
}
