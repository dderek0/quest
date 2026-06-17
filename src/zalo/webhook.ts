import type { Request, Response } from 'express';
import { config } from '../config';
import { zalo } from './client';
import {
  getClassByInvite, getClassByLink, getClassesByCoach, getClass, getCoursePack, mostRecentQuest,
  getMember, getMemberByChat, upsertMember, bindCoach, upsertCoachName, setLeaderboardOptIn,
  activeOpenQuests,
} from '../db/store';
import { signLink, signQuestLink } from '../domain/links';
import { chunkQuestMessages } from '../domain/notify';
import { aggregateClass } from '../skills/analytics';
import { leaderboardFromAgg, leaderboardText } from '../domain/leaderboard';

// Real payload is FLAT: { event_name, message: {...} }; some docs show a { result: {...} } wrapper.
type ZaloMessage = {
  from?: { id?: string; display_name?: string };
  chat?: { id?: string; chat_type?: 'PRIVATE' | 'GROUP' };
  text?: string;
  message_id?: string;
  date?: number;
};
type ZaloUpdate = {
  ok?: boolean;
  event_name?: string;
  message?: ZaloMessage;
  result?: { event_name?: string; message?: ZaloMessage };
};

const questUrl = (memberId: string, questId: string) => `${config.BASE_URL}/q/${signQuestLink({ m: memberId, c: questId })}`;
// One styled block per quest with its personalized link (newest first) — chunked into messages by caller.
const questBlocks = (memberId: string, quests: any[]) =>
  quests.map((z) => `• {orange}${z.title}{/orange}\n👉 ${questUrl(memberId, z.id)}`);

export async function handleWebhook(req: Request, res: Response) {
  if (req.header('X-Bot-Api-Secret-Token') !== config.ZALO_WEBHOOK_SECRET) {
    return res.status(401).json({ ok: false, error: 'bad secret' });
  }
  res.json({ ok: true }); // ACK immediately

  const update = req.body as ZaloUpdate;
  const payload = update.event_name || update.message ? update : update.result ?? update;
  const event = payload.event_name;
  const msg = payload.message;
  const chatId = msg?.chat?.id ?? msg?.from?.id;
  if (!chatId) return;
  const text = (msg?.text || '').trim();
  // Keep the latest display name for this chat id (used as the class owner name in admin).
  if (msg?.from?.display_name) upsertCoachName(chatId, msg.from.display_name).catch(() => {});

  try {
    zalo.sendChatAction(chatId, 'typing').catch(() => {}); // polish: show "typing…" while we work
    if (event !== 'message.text.received' || !text) {
      await zalo.sendMessage(chatId, '🤖 Quest hiện chỉ xử lý {orange}tin nhắn văn bản{/orange}.', { parseMode: 'markdown' });
      return;
    }

    // 1) invite code → join (public = auto-active; private = waitlist → Coach approves).
    //    This first message is also the opt-in for nudges.
    const cls = await getClassByInvite(text);
    if (cls) {
      const memberId = `${chatId}:${cls.id}`;
      const existing = await getMember(memberId);
      const isPublic = cls.visibility === 'public';
      const status = existing?.status ?? (isPublic ? 'active' : 'waitlist');
      if (!existing) {
        await upsertMember({
          id: memberId, classId: cls.id, chatId, name: msg?.from?.display_name,
          status, engagement: { xp: 0, level: 1, streak: 0 },
        });
      }
      if (status === 'active') {
        const quests = await activeOpenQuests(cls.id); // catch new joiners up on ALL active quests, not just one
        if (quests.length) {
          const header = `{big}🎉 Chào mừng vào lớp!{/big}\nLớp: {orange}${cls.name}{/orange}\n\n{green}Nhiệm vụ của bạn:{/green}`;
          for (const msg of chunkQuestMessages(header, questBlocks(memberId, quests))) await zalo.sendMessage(chatId, msg, { parseMode: 'markdown' });
        } else {
          await zalo.sendMessage(chatId, `{big}🎉 Đã vào lớp!{/big}\nLớp: {orange}${cls.name}{/orange}\nNgười dẫn đường sẽ giao nhiệm vụ sớm nhé.`, { parseMode: 'markdown' });
        }
      } else {
        await zalo.sendMessage(chatId, `{big}⏳ Đã gửi yêu cầu{/big}\nBạn đã xin vào lớp {orange}${cls.name}{/orange}.\n{yellow}Chờ Người dẫn đường duyệt nhé!{/yellow}`, { parseMode: 'markdown' });
        if (!existing && cls.coach_chat_id) {
          const boardUrl = `${config.BASE_URL}/board/${signLink({ m: 'coach', c: cls.id })}`;
          await zalo.sendMessage(cls.coach_chat_id, `{big}🔔 Yêu cầu tham gia{/big}\n{orange}${msg?.from?.display_name || 'Một học viên'}{/orange} xin vào lớp {orange}${cls.name}{/orange}.\n\nDuyệt tại Bảng điều khiển 👇\n${boardUrl}`, { parseMode: 'markdown' });
        }
      }
      return;
    }

    // 2) link code → bind as Coach
    const coachCls = await getClassByLink(text);
    if (coachCls) {
      await bindCoach(coachCls.id, chatId);
      const boardUrl = `${config.BASE_URL}/board/${signLink({ m: 'coach', c: coachCls.id })}`;
      await zalo.sendMessage(chatId, `{big}✅ Kết nối thành công{/big}\nBạn là {green}Người dẫn đường{/green} của lớp {orange}${coachCls.name}{/orange}.\n\n📋 Bảng điều khiển 👇\n${boardUrl}`, { parseMode: 'markdown' });
      return;
    }

    // 3) "học" → resend ALL the learner's currently-open quests
    if (/^(hoc|học|quest|nhiệm vụ|nhiem vu)$/i.test(text)) {
      const m = await getMemberByChat(chatId);
      if (!m) {
        await zalo.sendMessage(chatId, 'Bạn chưa vào lớp nào. Gửi {orange}mã mời{/orange} để tham gia nhé!', { parseMode: 'markdown' });
      } else if (m.status !== 'active') {
        await zalo.sendMessage(chatId, '⏳ {yellow}Yêu cầu vào lớp của bạn đang chờ Người dẫn đường duyệt.{/yellow}', { parseMode: 'markdown' });
      } else {
        const quests = await activeOpenQuests(m.class_id);
        if (quests.length) {
          const header = `{big}⚔️ Nhiệm vụ của bạn{/big}\nTiếp tục hành trình 👇`;
          for (const msg of chunkQuestMessages(header, questBlocks(m.id, quests))) await zalo.sendMessage(chatId, msg, { parseMode: 'markdown' });
        } else {
          await zalo.sendMessage(chatId, 'Hiện chưa có nhiệm vụ nào đang mở. Quay lại sau nhé! 🔔', { parseMode: 'markdown' });
        }
      }
      return;
    }

    // 3.5) "tạo lớp" → create-class link carrying the Coach's identity (so no code is needed)
    if (/^(tạo lớp|tao lop|tạo lớp mới|coach|giáo viên|giao vien)$/i.test(text)) {
      const k = signLink({ m: chatId, c: 'coach' });
      await zalo.sendMessage(chatId, `{big}👩‍🏫 Tạo lớp mới{/big}\nMở liên kết để tạo lớp của bạn 👇\n${config.BASE_URL}/new?k=${k}`, { parseMode: 'markdown' });
      return;
    }

    // 3.6) "xem lớp" / "lớp của tôi" / "quản lý" → list ALL the Coach's classes + links (one message)
    if (/^(xem lớp|xem lop|lớp của tôi|lop cua toi|danh sách lớp|danh sach lop|quản lý|quan ly|lớp|lop|my class)$/i.test(text)) {
      const classes = await getClassesByCoach(chatId);
      if (!classes.length) {
        await zalo.sendMessage(chatId, 'Bạn chưa quản lý lớp nào.\nGõ {orange}tạo lớp{/orange} để bắt đầu.', { parseMode: 'markdown' });
        return;
      }
      const MAX = 20; // safety cap against runaway spam
      for (const cl of classes.slice(0, MAX)) {
        const t = signLink({ m: 'coach', c: cl.id });
        try {
          await zalo.sendMessage(chatId, `{big}📚 ${cl.name}{/big}\n📋 Bảng: ${config.BASE_URL}/board/${t}\n📂 Quản lý: ${config.BASE_URL}/manage/${t}\n🎟 Mã mời: {orange}${cl.invite_code}{/orange}`, { parseMode: 'markdown' });
        } catch (e) {
          console.error('xem lớp send error:', e);
        }
      }
      if (classes.length > MAX) await zalo.sendMessage(chatId, `… và ${classes.length - MAX} lớp khác.`, { parseMode: 'markdown' });
      return;
    }

    // 3.7) "admin" → OWNER ONLY: mint a short-lived signed admin link.
    //      Non-owners don't match (the &&), so they fall through to the normal help — the command stays invisible.
    if (/^(admin|quản trị|quan tri)$/i.test(text) && config.OWNER_CHAT_ID && chatId === config.OWNER_CHAT_ID) {
      const t = signLink({ m: 'admin', c: chatId }, config.ADMIN_TTL_SECONDS);
      await zalo.sendMessage(chatId, `{big}🛡️ Cổng quản trị{/big}\nLiên kết hiệu lực ${Math.round(config.ADMIN_TTL_SECONDS / 60)} phút 👇\n${config.BASE_URL}/admin?t=${t}`, { parseMode: 'markdown' });
      return;
    }

    // 3.8) "bxh" / "xếp hạng" → the learner's class leaderboard (ranked by mastery; peers anonymized unless opted in).
    if (/^(bxh|xh|top|xếp hạng|xep hang|bảng xếp hạng|bang xep hang)$/i.test(text)) {
      const m = await getMemberByChat(chatId);
      if (!m || m.status !== 'active') {
        await zalo.sendMessage(chatId, 'Bạn cần vào một lớp trước đã. Gửi {orange}mã mời{/orange} để tham gia nhé!', { parseMode: 'markdown' });
        return;
      }
      const cls = await getClass(m.class_id);
      const courseId = cls?.active_quest_id || cls?.course_id || (await mostRecentQuest(m.class_id));
      const course = courseId ? await getCoursePack(courseId) : null;
      const entries = leaderboardFromAgg(await aggregateClass(m.class_id, course));
      const optedIn = !!(m.engagement && m.engagement.lb);
      const hint = optedIn
        ? 'Gõ {orange}ẩn tên{/orange} để xếp hạng ẩn danh.'
        : 'Gõ {orange}hiện tên{/orange} để công khai tên của bạn trên bảng.';
      await zalo.sendMessage(chatId, leaderboardText(cls?.name || 'Lớp', entries, m.id) + `\n\n${hint}`, { parseMode: 'markdown' });
      return;
    }

    // 3.9) leaderboard name visibility opt-in / opt-out (peers only — you're always ranked either way).
    const optIn = /^(hiện tên|hien ten|công khai|cong khai)$/i.test(text);
    const optOut = /^(ẩn tên|an ten|ẩn danh|an danh|giấu tên|giau ten)$/i.test(text);
    if (optIn || optOut) {
      const m = await getMemberByChat(chatId);
      if (!m) {
        await zalo.sendMessage(chatId, 'Bạn chưa vào lớp nào. Gửi {orange}mã mời{/orange} để tham gia nhé!', { parseMode: 'markdown' });
        return;
      }
      await setLeaderboardOptIn(m.id, optIn);
      await zalo.sendMessage(chatId, optIn
        ? '{green}✅ Đã công khai tên{/green} của bạn trên bảng xếp hạng.'
        : '{yellow}🙈 Đã ẩn tên{/yellow} — bạn vẫn được xếp hạng, nhưng hiện ẩn danh với người khác.', { parseMode: 'markdown' });
      return;
    }

    // 4) fallback
    await zalo.sendMessage(chatId, '{big}👋 Chào bạn!{/big}\n{green}🎓 Học viên:{/green} gửi {orange}mã mời{/orange} để vào lớp · {orange}học{/orange} nhận nhiệm vụ · {orange}bxh{/orange} xem xếp hạng.\n👩‍🏫 {green}Người dẫn đường:{/green} gõ {orange}tạo lớp{/orange} hoặc {orange}xem lớp{/orange}.', { parseMode: 'markdown' });
  } catch (err) {
    console.error('webhook handler error:', err);
  }
}
