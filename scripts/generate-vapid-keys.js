/**
 * Script para gerar chaves VAPID para Web Push Notifications
 * 
 * Execute: pnpm generate-vapid
 * 
 * As chaves geradas devem ser adicionadas ao arquivo .env.local:
 * VAPID_PUBLIC_KEY=<chave pública gerada>
 * VAPID_PRIVATE_KEY=<chave privada gerada>
 * VAPID_SUBJECT=mailto:seu-email@exemplo.com
 */

const webpush = require('web-push');

// Gera as chaves VAPID
const vapidKeys = webpush.generateVAPIDKeys();

console.log('\n=== Chaves VAPID Geradas ===\n');
console.log('Chave Pública (VAPID_PUBLIC_KEY):');
console.log(vapidKeys.publicKey);
console.log('\nChave Privada (VAPID_PRIVATE_KEY):');
console.log(vapidKeys.privateKey);
console.log('\n=== Configuração ===\n');
console.log('Adicione estas variáveis ao seu arquivo .env.local:\n');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('VAPID_SUBJECT=mailto:seu-email@exemplo.com');
console.log('\n⚠️  IMPORTANTE: Substitua "seu-email@exemplo.com" pelo seu email real!\n');

