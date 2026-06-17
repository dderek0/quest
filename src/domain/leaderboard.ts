import type { ClassAgg } from '../skills/analytics';

// Leaderboard = deterministic ranking of a class by per-concept mastery (BKT average). The LLM does
// nothing here. Opt-in controls ONLY peer visibility of names: opted-in members show their display
// name; everyone else appears anonymized as "Anh hùng N". The viewer always sees their own row, named.
export type LbEntry = {
  id: string; name: string; mastery: number; streak: number; answered: number; optedIn: boolean; rank: number;
};

const pct = (n: number) => Math.round((n || 0) * 100);

// Rank desc by mastery, tie-break streak → answered → name. Stable, 1-based.
export function leaderboardFromAgg(agg: ClassAgg): LbEntry[] {
  return [...agg.members]
    .sort(
      (a, b) =>
        b.avgMastery - a.avgMastery ||
        b.streak - a.streak ||
        b.answered - a.answered ||
        a.name.localeCompare(b.name, 'vi'),
    )
    .map((m, i) => ({
      id: m.id, name: m.name, mastery: m.avgMastery, streak: m.streak,
      answered: m.answered, optedIn: m.optedIn, rank: i + 1,
    }));
}

// Name as shown to a given viewer: own row → "Tên (Bạn)"; opted-in peer → real name; else anonymized.
export function lbDisplayName(e: LbEntry, viewerId?: string): string {
  if (viewerId && e.id === viewerId) return `${e.name || 'Bạn'} (Bạn)`;
  if (e.optedIn) return e.name || `Anh hùng ${e.rank}`;
  return `Anh hùng ${e.rank}`;
}

const medal = (r: number) => (r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : `${r}.`);

// Styled Zalo text block (balanced markdown shortcodes) for the bot. Top N + the viewer's own row if below.
export function leaderboardText(className: string, entries: LbEntry[], viewerId?: string, top = 10): string {
  if (!entries.length)
    return `{big}🏆 Bảng xếp hạng{/big}\n{orange}${className}{/orange}\nChưa có dữ liệu — làm một nhiệm vụ để lên bảng nhé!`;
  const line = (e: LbEntry) => `${medal(e.rank)} ${lbDisplayName(e, viewerId)} — {orange}${pct(e.mastery)}%{/orange}`;
  const lines = entries.slice(0, top).map(line);
  const me = entries.find((e) => e.id === viewerId);
  if (me && me.rank > top) lines.push('⋯', line(me));
  return `{big}🏆 Bảng xếp hạng{/big}\n{orange}${className}{/orange} · theo độ thành thạo\n\n${lines.join('\n')}`;
}
