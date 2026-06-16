// A self-contained sample "quest" page — opens in Zalo's in-app browser.
// Includes OpenGraph tags so a bare link may auto-preview into a card.
export function renderSampleQuest(baseUrl: string, id: string): string {
  const url = `${baseUrl}/q/${id}`;
  const ogImage = 'https://picsum.photos/seed/quest-og/1200/630'; // placeholder card image
  return `<!doctype html>
<html lang="vi"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Quest — Nhiệm vụ hôm nay</title>
<meta name="description" content="5 phút · 5 câu hỏi · +120 XP. Chạm để bắt đầu.">
<meta property="og:type" content="website">
<meta property="og:title" content="⚔️ Nhiệm vụ hôm nay — Chính sách AI">
<meta property="og:description" content="5 phút · 5 câu hỏi · +120 XP. Chạm để bắt đầu nhiệm vụ của bạn.">
<meta property="og:image" content="${ogImage}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="Quest">
<meta name="twitter:card" content="summary_large_image">
<style>
  :root{--vng:#f1592b;--green:#10b981;--greenD:#059669;--blue:#0068ff;--ink:#16212e;--muted:#5b6b7f;--line:rgba(20,33,48,.1)}
  *{box-sizing:border-box} html,body{margin:0}
  body{font-family:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:var(--ink);
    background:radial-gradient(700px 380px at 0% -10%,rgba(16,185,129,.12),transparent 60%),
               radial-gradient(700px 380px at 100% 0%,rgba(0,104,255,.12),transparent 60%),#f6f8fc;
    -webkit-font-smoothing:antialiased;padding:16px;max-width:520px;margin:0 auto}
  .top{display:flex;align-items:center;justify-content:space-between;margin:4px 2px 14px}
  .wm{font-weight:800;font-size:22px;letter-spacing:-.02em;
    background:linear-gradient(110deg,#0ea869,#10b981 30%,#0068ff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
  .wm .s{-webkit-text-fill-color:var(--vng);color:var(--vng)}
  .flame{font-size:12px;font-weight:700;color:var(--vng);background:rgba(241,89,43,.1);border:1px solid rgba(241,89,43,.25);padding:5px 11px;border-radius:99px}
  .card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px;box-shadow:0 6px 22px rgba(20,33,48,.06);margin-bottom:14px}
  .row{display:flex;align-items:center;gap:10px}
  .chip{font-size:11px;font-weight:700;color:var(--blue);background:rgba(0,104,255,.1);padding:4px 10px;border-radius:8px}
  .lvl{font-size:11px;color:var(--muted);margin-left:auto}
  .xp{height:9px;border-radius:99px;background:#e9eef4;overflow:hidden;margin-top:11px;position:relative}
  .xp i{position:absolute;inset:0;width:64%;background:linear-gradient(90deg,var(--green),var(--blue))}
  h1{font-size:18px;margin:2px 0 8px;font-weight:800}
  .lesson{font-size:14.5px;color:#33414f;line-height:1.55}
  .qn{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--vng)}
  .qq{font-size:15.5px;font-weight:700;margin:7px 0 13px}
  .opt{display:flex;align-items:center;gap:11px;border:1.5px solid #e6ebf1;border-radius:12px;padding:12px 13px;margin-bottom:9px;font-size:14px;cursor:pointer;transition:.15s}
  .opt .k{width:24px;height:24px;border-radius:7px;background:#eef2f7;display:grid;place-items:center;font-weight:700;font-size:12px;color:#6b7a8d;flex:none}
  .opt.sel{border-color:var(--blue);background:rgba(0,104,255,.06)}
  .opt.ok{border-color:var(--green);background:rgba(16,185,129,.1)} .opt.ok .k{background:var(--green);color:#fff}
  .opt.no{opacity:.55}
  .btn{display:block;width:100%;border:0;margin-top:6px;background:linear-gradient(120deg,var(--vng),#ff7a3c);color:#fff;
    font-weight:800;font-size:15px;padding:14px;border-radius:13px;cursor:pointer;font-family:inherit}
  .fb{display:none;margin-top:12px;font-weight:700;font-size:14px;color:var(--greenD);background:rgba(16,185,129,.1);
    border:1px solid rgba(16,185,129,.25);border-radius:11px;padding:11px 13px;text-align:center}
  .foot{text-align:center;color:var(--muted);font-size:12px;margin:6px 0 10px}
</style>
</head><body>
  <div class="top"><div class="wm">QUEST<span class="s">✦</span></div><div class="flame">🔥 6 ngày</div></div>

  <div class="card">
    <div class="row"><span class="chip">Lớp · Chính sách AI</span><span class="lvl">Cấp 4 · 640 XP</span></div>
    <div class="xp"><i></i></div>
  </div>

  <div class="card">
    <h1>📖 Hôm nay</h1>
    <div class="lesson">Khi dùng dữ liệu người chơi với mô hình AI, ta chỉ được đưa vào <b>dữ liệu đã ẩn danh</b> —
    không gồm họ tên, số điện thoại hay lịch sử thanh toán. Đây là nguyên tắc cốt lõi của chính sách AI tuần này.</div>
  </div>

  <div class="card">
    <div class="qn">Câu 1 / 5 · Thử thách ⚔️</div>
    <div class="qq">Dữ liệu người chơi nào được phép đưa vào mô hình AI?</div>
    <div class="opt" data-c="0"><span class="k">A</span> Họ tên &amp; số điện thoại</div>
    <div class="opt" data-c="1"><span class="k">B</span> Dữ liệu đã ẩn danh</div>
    <div class="opt" data-c="2"><span class="k">C</span> Lịch sử thanh toán</div>
    <button class="btn" id="go">Trả lời</button>
    <div class="fb" id="fb">✅ Chính xác! +20 XP ⭐</div>
  </div>

  <div class="foot">✦ Mở ngay trong Zalo · không cần đăng nhập</div>

<script>
  var sel=-1, done=false;
  var opts=document.querySelectorAll('.opt');
  opts.forEach(function(o){o.addEventListener('click',function(){
    if(done)return; sel=+o.getAttribute('data-c');
    opts.forEach(function(x){x.classList.remove('sel')}); o.classList.add('sel');
  });});
  document.getElementById('go').addEventListener('click',function(){
    if(done||sel<0)return; done=true;
    opts.forEach(function(x){var c=+x.getAttribute('data-c');
      if(c===1)x.classList.add('ok'); else if(c===sel)x.classList.add('no'); else x.classList.add('no');});
    var fb=document.getElementById('fb');
    if(sel===1){fb.textContent='✅ Chính xác! +20 XP ⭐';}
    else{fb.textContent='Gần đúng — đáp án là B. Quest sẽ giảng lại nhé 🙂';fb.style.color='#b45309';fb.style.background='rgba(245,158,11,.12)';fb.style.borderColor='rgba(245,158,11,.3)';}
    fb.style.display='block';
    this.textContent='Câu tiếp theo →';
  });
</script>
</body></html>`;
}
