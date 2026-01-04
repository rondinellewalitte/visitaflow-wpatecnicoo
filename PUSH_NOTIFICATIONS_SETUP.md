# Configuração de Push Notifications - VisitaFlow Técnico

Este documento explica como configurar e usar Push Notifications (Web Push) no VisitaFlow Técnico.

## 📋 Pré-requisitos

- Node.js e pnpm instalados
- Projeto Next.js configurado
- Supabase configurado e funcionando
- PWA já instalável (já está configurado)

## 🔑 Passo 1: Gerar Chaves VAPID

1. Execute o script para gerar as chaves VAPID:

```bash
pnpm generate-vapid
```

2. O script irá gerar duas chaves:
   - **VAPID_PUBLIC_KEY**: Chave pública (pode ser exposta no cliente)
   - **VAPID_PRIVATE_KEY**: Chave privada (deve ser mantida em segredo)

3. Copie as chaves geradas.

## 🔧 Passo 2: Configurar Variáveis de Ambiente

Adicione as seguintes variáveis ao arquivo `.env.local`:

```env
# Chaves VAPID (obrigatórias)
VAPID_PUBLIC_KEY=<chave pública gerada>
VAPID_PRIVATE_KEY=<chave privada gerada>
VAPID_SUBJECT=mailto:seu-email@exemplo.com

# Secret interno para proteger a rota de envio (obrigatório)
INTERNAL_SECRET=<uma string aleatória segura>

# Supabase (já deve estar configurado)
NEXT_PUBLIC_SUPABASE_URL=<sua url do supabase>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<sua chave anônima>
SUPABASE_SERVICE_ROLE_KEY=<sua service role key> # Opcional, mas recomendado
```

**⚠️ IMPORTANTE:**
- Substitua `mailto:seu-email@exemplo.com` pelo seu email real
- Use uma string aleatória segura para `INTERNAL_SECRET`
- Nunca commite o arquivo `.env.local` no git

## 🗄️ Passo 3: Criar Tabela no Supabase

Execute o SQL de migração no Supabase:

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Execute o conteúdo do arquivo `supabase/migrations/create_push_subscriptions_table.sql`

Ou execute diretamente no SQL Editor:

```sql
-- Ver conteúdo do arquivo supabase/migrations/create_push_subscriptions_table.sql
```

## 📦 Passo 4: Instalar Dependências

```bash
pnpm install
```

Isso instalará o pacote `web-push` necessário para enviar notificações.

## ✅ Passo 5: Verificar Configuração

1. Inicie o servidor de desenvolvimento:

```bash
pnpm dev
```

2. Acesse o dashboard (`/dashboard`)
3. Você verá o componente "Notificações Push"
4. Clique em "Ativar Notificações"
5. O navegador solicitará permissão - aceite

## 🚀 Como Usar

### No Dashboard

O componente `PushNotificationManager` já está integrado no dashboard. Os usuários podem:
- Ativar/desativar notificações push
- Ver o status atual das notificações

### Enviar Notificações (Exemplos)

#### Exemplo 1: Enviar para um técnico específico

```typescript
import { sendPushToTechnician } from '@/lib/push-send-example';

await sendPushToTechnician(
  'user-id-aqui',
  'Nova Visita',
  'Você tem uma nova visita atribuída',
  '/visit/123'
);
```

#### Exemplo 2: Enviar para todos os técnicos

```typescript
import { sendPushToAllTechnicians } from '@/lib/push-send-example';

await sendPushToAllTechnicians(
  'Nova Visita Disponível',
  'Uma nova visita foi adicionada ao sistema'
);
```

#### Exemplo 3: Notificar sobre nova visita

```typescript
import { notifyNewVisit } from '@/lib/push-send-example';

await notifyNewVisit(
  'user-id-aqui',
  'Instalação de Ar Condicionado',
  'visit-id-aqui'
);
```

#### Exemplo 4: Notificar sobre visita hoje

```typescript
import { notifyVisitToday } from '@/lib/push-send-example';

await notifyVisitToday(
  'user-id-aqui',
  'Manutenção Preventiva',
  'visit-id-aqui'
);
```

### Enviar Notificações via API

Você também pode enviar notificações fazendo uma requisição HTTP:

```bash
curl -X POST http://localhost:3000/api/push/send \
  -H "Content-Type: application/json" \
  -H "x-internal-secret: seu-secret-aqui" \
  -d '{
    "userId": "user-id-opcional",
    "title": "Título da Notificação",
    "body": "Corpo da notificação",
    "url": "/dashboard"
  }'
```

## 📱 Compatibilidade

### ✅ Suportado
- **Android**: Chrome, Edge, Firefox (PWA instalado)
- **iOS**: Safari (PWA instalado, iOS 16.4+)
- **Desktop**: Chrome, Edge, Firefox, Safari

### ⚠️ Requisitos
- **Android**: PWA deve estar instalado
- **iOS**: PWA deve estar instalado e iOS 16.4 ou superior
- **Desktop**: Navegador moderno com suporte a Service Workers

## 🔒 Segurança

1. **VAPID Private Key**: Nunca exponha no cliente
2. **INTERNAL_SECRET**: Use um valor aleatório forte
3. **RLS no Supabase**: As políticas RLS garantem que usuários só vejam suas próprias subscriptions
4. **Autenticação**: A rota `/api/push/subscribe` requer autenticação

## 🐛 Troubleshooting

### Notificações não aparecem

1. Verifique se o Service Worker está registrado (DevTools > Application > Service Workers)
2. Verifique se a permissão foi concedida (DevTools > Application > Notifications)
3. Verifique se as chaves VAPID estão configuradas corretamente
4. Verifique o console do navegador para erros

### Erro "VAPID keys não configuradas"

- Verifique se as variáveis `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` estão no `.env.local`
- Reinicie o servidor após adicionar as variáveis

### Subscription não é salva

- Verifique se a tabela `push_subscriptions` foi criada no Supabase
- Verifique se o usuário está autenticado
- Verifique os logs do servidor para erros

### Notificações não funcionam no iOS

- Certifique-se de que o PWA está instalado (adicionado à tela inicial)
- iOS requer PWA instalado para push notifications funcionarem
- Verifique se está usando iOS 16.4 ou superior

## 📚 Arquivos Criados

- `scripts/generate-vapid-keys.js` - Script para gerar chaves VAPID
- `lib/push-notifications.ts` - Funções client-side para gerenciar subscriptions
- `lib/push-send-example.ts` - Exemplos de funções para enviar notificações
- `lib/supabase-server.ts` - Cliente Supabase para API routes
- `components/PushNotificationManager.tsx` - Componente UI para gerenciar notificações
- `app/api/push/subscribe/route.ts` - API route para salvar subscriptions
- `app/api/push/send/route.ts` - API route para enviar notificações
- `app/api/push/vapid-key/route.ts` - API route para obter chave pública VAPID
- `public/service-worker.js` - Service Worker atualizado com handlers de push
- `supabase/migrations/create_push_subscriptions_table.sql` - SQL migration

## 🎯 Próximos Passos

1. Configure as variáveis de ambiente
2. Execute a migration no Supabase
3. Teste ativando notificações no dashboard
4. Teste enviando uma notificação de exemplo
5. Integre notificações em eventos do sistema (novas visitas, lembretes, etc.)

## 📝 Notas Importantes

- As subscriptions são únicas por usuário e endpoint
- Se uma subscription se tornar inválida (410), ela é automaticamente removida
- O Service Worker gerencia a exibição das notificações
- Ao clicar na notificação, o app abre na URL especificada

