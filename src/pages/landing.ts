import { renderPage, topbar } from './ui';
import { config } from '../config';

// GET / — public landing page. Entry point: Coaches start a class; members go to the Zalo bot.
const CSS = `
.hero{padding:14px 2px 6px}
.hero h1{font-size:34px;margin:10px 0 0}
.hero .lead{color:var(--muted);font-size:15px;line-height:1.6;margin:12px 0 0;max-width:30em}
.roles{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:22px 0 8px}
.role{background:#fff;border:1px solid var(--line);border-radius:18px;box-shadow:var(--soft);padding:18px;display:flex;flex-direction:column}
.role .ic{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;font-size:23px;background:linear-gradient(150deg,rgba(16,185,129,.14),rgba(0,104,255,.12));margin-bottom:12px}
.role h2{font-family:'Space Grotesk',sans-serif;font-size:17px;margin:0 0 5px}
.role p{margin:0 0 14px;font-size:13px;color:var(--muted);line-height:1.5;flex:1}
.role .btn{width:100%}
.role .hint{font-size:12px;color:var(--dim);background:#f1f5fa;border:1px solid var(--line);border-radius:10px;padding:9px 11px;line-height:1.45}
.feats{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0 6px}
.feat{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid var(--line2);border-radius:99px;padding:8px 13px;font-size:12.5px;font-weight:600;box-shadow:var(--soft)}
.foot{color:var(--dim);font-size:12px;text-align:center;margin-top:26px}
.foot b{color:var(--muted)}
@media(max-width:430px){.roles{grid-template-columns:1fr}.hero h1{font-size:29px}}
`;

export function renderLanding(): string {
  const body = `
  ${topbar('<a class="btn primary sm" href="/new">Tạo lớp</a>')}
  <section class="hero">
    <div class="eyebrow">Học như chơi game · ngay trong Zalo</div>
    <h1 class="display">Biến tài liệu thành <span class="grad">nhiệm vụ học tập</span></h1>
    <p class="lead">Người dẫn đường tải tài liệu, AI tạo câu hỏi cá nhân hoá cho từng học viên — và theo dõi cả lớp trên một bảng điều khiển duy nhất.</p>
  </section>

  <div class="roles">
    <div class="role">
      <div class="ic">👩‍🏫</div>
      <h2>Tôi là Người dẫn đường</h2>
      <p>Tạo lớp, tải tài liệu và giao nhiệm vụ cho học viên.</p>
      <a class="btn primary" href="/new">Tạo lớp mới</a>
    </div>
    <div class="role">
      <div class="ic">🎓</div>
      <h2>Tôi là học viên</h2>
      <p>Mở bot <b>Quest</b> trên Zalo và gửi mã mời từ Người dẫn đường để vào lớp.</p>
      <a class="btn dark" href="${config.ZALO_BOT_URL}" target="_blank" rel="noopener">💬 Mở bot trên Zalo</a>
      <div class="hint" style="margin-top:10px">Chưa có mã? Hỏi Người dẫn đường của bạn nhé.</div>
    </div>
  </div>

  <div class="feats">
    <span class="feat">🇻🇳 Tiếng Việt</span>
    <span class="feat">🎮 XP &amp; cấp độ</span>
    <span class="feat">🧠 Vừa sức từng người</span>
    <span class="feat">📋 Bảng điều khiển cho Người dẫn đường</span>
    <span class="feat">🔒 Không cần đăng nhập</span>
  </div>

  <div class="foot">Quest✦ · trợ lý học tập AI trên Zalo</div>`;
  return renderPage({ title: 'Quest — học như chơi game, ngay trong Zalo', body, css: CSS, max: 620 });
}
