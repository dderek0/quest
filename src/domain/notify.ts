// Group quest "blocks" (one per quest) into as few Zalo messages as possible, each well under
// the 2000-char limit — so a long list of signed quest links is never truncated mid-URL by
// guard.safetyScope's clamp. Header is repeated at the top of each message.
export function chunkQuestMessages(header: string, blocks: string[], limit = 1700): string[] {
  const msgs: string[] = [];
  let cur = '';
  for (const b of blocks) {
    const next = cur ? `${cur}\n${b}` : `${header}\n${b}`;
    if (next.length > limit && cur) { msgs.push(cur); cur = `${header}\n${b}`; }
    else cur = next;
  }
  if (cur) msgs.push(cur);
  return msgs;
}
