import express from 'express';
import multer from 'multer';
import path from 'path';
import { config } from './config';
import { handleWebhook } from './zalo/webhook';
import {
  questPage, submitAnswer, completeQuestHandler, boardPage, askHandler, approveHandler, visibilityHandler,
  newClassPage, createClassHandler, managePage, addMaterialHandler, uploadMaterialHandler, createQuestHandler,
  activateQuestHandler, toggleQuestHandler, resendQuestHandler, remindQuestHandler, configQuestHandler,
  landingPage, adminPage, deleteClassHandler, adminNudgeHandler, leaderboardOptInHandler,
} from './api/routes';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });

const app = express();
app.use(express.json({ limit: '2mb' }));
// Always serve fresh HTML/JSON (these pages change often during dev; avoid stale browser cache)
app.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
// static assets (e.g. the voice .aac for sendVoice demos)
app.use('/assets', express.static(path.join(__dirname, '../public/assets')));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'quest', ts: Date.now() }));

// Pitch / voting page (static, self-contained). Served at /pitch on any host, and on the
// marketing domain's ROOT (PITCH_HOST, default quest.gssea.space) so that domain shows the pitch.
const PITCH_HOSTS = (process.env.PITCH_HOST || 'quest.gssea.space').split(',').map((s) => s.trim().toLowerCase());
const pitchFile = path.join(__dirname, '../pitch/index.html');
const sendPitch = (res: express.Response) => { res.set('Cache-Control', 'public, max-age=300'); res.sendFile(pitchFile); };
app.get('/pitch', (_req, res) => sendPitch(res));

// Root: the pitch page on the marketing domain, the Coach landing everywhere else.
app.get('/', (req, res, next) => {
  const host = (req.headers.host || '').split(':')[0].toLowerCase();
  if (PITCH_HOSTS.includes(host)) return sendPitch(res);
  next();
}, landingPage);

// Admin overview (owner-only — opened via a signed, short-lived link issued by the bot)
app.get('/admin', adminPage);
app.post('/api/admin/delete-class', deleteClassHandler);
app.post('/api/admin/nudge', adminNudgeHandler);

// Zalo Bot inbound webhook
app.post('/zalo/webhook', handleWebhook);

// Learner quest page (token-gated, no login) + answer submission + completion
app.get('/q/:token', questPage);
app.post('/api/answer', submitAnswer);
app.post('/api/quest/complete', completeQuestHandler);
app.post('/api/leaderboard/optin', leaderboardOptInHandler); // learner toggles name visibility on the leaderboard

// Coach's Board + ask-your-class + approve/visibility
app.get('/board/:token', boardPage);
app.post('/api/ask', askHandler);
app.post('/api/approve', approveHandler);
app.post('/api/visibility', visibilityHandler);

// Coach self-serve class creation + management (Materials → Quests)
app.get('/new', newClassPage);
app.post('/api/class', createClassHandler);
app.get('/manage/:token', managePage);
app.post('/api/material', addMaterialHandler);
app.post('/api/material/upload', upload.single('file'), uploadMaterialHandler);
app.post('/api/quest', createQuestHandler);
app.post('/api/quest/activate', activateQuestHandler);   // assign + notify
app.post('/api/quest/toggle', toggleQuestHandler);       // on/off switch (no notify)
app.post('/api/quest/resend', resendQuestHandler);       // re-broadcast to everyone (boost)
app.post('/api/quest/remind', remindQuestHandler);       // nudge only those who haven't completed it
app.post('/api/quest/config', configQuestHandler);       // redo / attempts / schedule

app.listen(config.PORT, () => {
  console.log(`✅ Quest listening on :${config.PORT}`);
  console.log(`   BASE_URL = ${config.BASE_URL}`);
  console.log(`   webhook  = ${config.BASE_URL}/zalo/webhook`);
});
