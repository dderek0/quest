import { config } from '../config';
import { zalo } from '../zalo/client';

// Verifies the bot token, then registers BASE_URL/zalo/webhook with the secret.
async function main() {
  const url = `${config.BASE_URL}/zalo/webhook`;

  console.log('• Verifying bot token (getMe)…');
  console.log('  bot:', await zalo.getMe());

  console.log(`• setWebhook → ${url}`);
  console.log('  result:', await zalo.setWebhook(url, config.ZALO_WEBHOOK_SECRET));

  console.log('• getWebhookInfo:');
  console.log('  ', await zalo.getWebhookInfo());

  console.log('\n✅ Done. Message your bot in Zalo to test the echo.');
}

main().catch((e) => {
  console.error('❌', e instanceof Error ? e.message : e);
  process.exit(1);
});
