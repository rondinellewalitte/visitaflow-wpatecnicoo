-- Migration: Criar tabela push_subscriptions
-- Descrição: Armazena as subscriptions de Web Push Notifications dos técnicos
-- Data: 2024

-- Cria a tabela push_subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Garante que um usuário não tenha subscriptions duplicadas com o mesmo endpoint
  UNIQUE(user_id, endpoint)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER trigger_update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_push_subscriptions_updated_at();

-- RLS (Row Level Security) - Política para usuários verem apenas suas próprias subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver apenas suas próprias subscriptions
CREATE POLICY "Users can view their own push subscriptions"
  ON push_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Usuários podem inserir suas próprias subscriptions
CREATE POLICY "Users can insert their own push subscriptions"
  ON push_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: Usuários podem atualizar suas próprias subscriptions
CREATE POLICY "Users can update their own push subscriptions"
  ON push_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Política: Usuários podem deletar suas próprias subscriptions
CREATE POLICY "Users can delete their own push subscriptions"
  ON push_subscriptions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Comentários para documentação
COMMENT ON TABLE push_subscriptions IS 'Armazena as subscriptions de Web Push Notifications dos técnicos';
COMMENT ON COLUMN push_subscriptions.user_id IS 'ID do usuário (técnico) que possui esta subscription';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'URL do endpoint do serviço de push (único por serviço)';
COMMENT ON COLUMN push_subscriptions.p256dh IS 'Chave pública P256DH da subscription (base64)';
COMMENT ON COLUMN push_subscriptions.auth IS 'Chave de autenticação da subscription (base64)';

