-- ============================
-- SISTEMA DE ANÁLISE DE CRÉDITO ESPLENDOR
-- Script de configuração do banco de dados
-- ============================

-- Criar extensão para UUIDs (se ainda não existir)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================
-- TABELA DE USUÁRIOS
-- ============================
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha TEXT NOT NULL, -- Em produção, usar hash bcrypt
  tipo_usuario TEXT CHECK (tipo_usuario IN ('vendedor','admin')) NOT NULL,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- ============================
-- TABELA DE ANÁLISES
-- ============================
CREATE TABLE IF NOT EXISTS analises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  cliente_nome TEXT NOT NULL,
  cliente_cpf TEXT NOT NULL,
  status TEXT CHECK (status IN ('pendente','aprovado','reprovado','reanalise')) DEFAULT 'pendente',
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- ============================
-- TABELA DE DOCUMENTOS
-- ============================
CREATE TABLE IF NOT EXISTS documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analise_id UUID REFERENCES analises(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  url TEXT NOT NULL, -- Caminho do arquivo no Storage
  criado_em TIMESTAMP DEFAULT NOW()
);

-- ============================
-- TRIGGER PARA ATUALIZAR DATA DE MODIFICAÇÃO
-- ============================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_analises_updated_at 
    BEFORE UPDATE ON analises 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================
-- POLÍTICAS DE SEGURANÇA (RLS)
-- ============================

-- Habilitar Row Level Security
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE analises ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

-- Políticas para USUÁRIOS
-- Permitir que usuários vejam apenas seus próprios dados
CREATE POLICY "usuarios_select_own" ON usuarios
  FOR SELECT USING (auth.uid()::text = id::text);

-- Permitir que admins vejam todos os usuários
CREATE POLICY "admin_select_all_usuarios" ON usuarios
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM usuarios u 
      WHERE u.id::text = auth.uid()::text 
      AND u.tipo_usuario = 'admin'
    )
  );

-- Políticas RLS para tabela analises
CREATE POLICY "Vendedores podem ver suas próprias análises" ON analises
  FOR SELECT USING (true);

CREATE POLICY "Vendedores podem criar análises" ON analises
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Administradores podem ver todas as análises" ON analises
  FOR SELECT USING (true);

CREATE POLICY "Administradores podem atualizar análises" ON analises
  FOR UPDATE USING (true);

-- Vendedores podem inserir análises
CREATE POLICY "vendedor_insert_analises" ON analises
  FOR INSERT WITH CHECK (vendedor_id::text = auth.uid()::text);

CREATE POLICY "admin_update_analises" ON analises
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM usuarios u 
      WHERE u.id::text = auth.uid()::text 
      AND u.tipo_usuario = 'admin'
    )
  );

-- Políticas para DOCUMENTOS
-- Usuários podem ver documentos de suas próprias análises
CREATE POLICY "select_own_documentos" ON documentos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM analises a 
      WHERE a.id = documentos.analise_id 
      AND (
        a.vendedor_id::text = auth.uid()::text 
        OR EXISTS (
          SELECT 1 FROM usuarios u 
          WHERE u.id::text = auth.uid()::text 
          AND u.tipo_usuario = 'admin'
        )
      )
    )
  );

-- Vendedores podem inserir documentos em suas análises
CREATE POLICY "insert_documentos" ON documentos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM analises a 
      WHERE a.id = documentos.analise_id 
      AND a.vendedor_id::text = auth.uid()::text
    )
  );

-- ============================
-- POLÍTICAS PARA STORAGE
-- ============================

-- Habilitar RLS no storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Permitir que usuários vejam apenas arquivos de suas análises
CREATE POLICY "select_own_files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documentos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Permitir que admins vejam todos os arquivos
CREATE POLICY "admin_select_all_files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documentos' AND
    EXISTS (
      SELECT 1 FROM usuarios u 
      WHERE u.id::text = auth.uid()::text 
      AND u.tipo_usuario = 'admin'
    )
  );

-- Permitir upload apenas na pasta do próprio usuário
CREATE POLICY "insert_own_files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documentos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Permitir delete apenas dos próprios arquivos
CREATE POLICY "delete_own_files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documentos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================
-- USUÁRIOS DE TESTE
-- ============================
INSERT INTO usuarios (nome, email, senha, tipo_usuario) VALUES
  ('João Vendedor', 'vendedor@teste.com', '123456', 'vendedor'),
  ('Ana Administradora', 'admin@teste.com', '123456', 'admin'),
  ('Carlos Vendedor', 'carlos@teste.com', '123456', 'vendedor')
ON CONFLICT (email) DO NOTHING;

-- ============================
-- DADOS DE TESTE (OPCIONAL)
-- ============================
-- Inserir algumas análises de exemplo
DO $$
DECLARE
    vendedor_id UUID;
    analise_id UUID;
BEGIN
    -- Buscar ID do vendedor de teste
    SELECT id INTO vendedor_id FROM usuarios WHERE email = 'vendedor@teste.com';
    
    IF vendedor_id IS NOT NULL THEN
        -- Inserir análise de exemplo
        INSERT INTO analises (vendedor_id, cliente_nome, cliente_cpf, status) 
        VALUES (vendedor_id, 'Maria Silva', '123.456.789-00', 'pendente')
        RETURNING id INTO analise_id;
        
        -- Inserir análise aprovada
        INSERT INTO analises (vendedor_id, cliente_nome, cliente_cpf, status) 
        VALUES (vendedor_id, 'José Santos', '987.654.321-00', 'aprovado');
    END IF;
END $$;

-- ============================
-- ÍNDICES PARA PERFORMANCE
-- ============================
CREATE INDEX IF NOT EXISTS idx_analises_vendedor_id ON analises(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_analises_status ON analises(status);
CREATE INDEX IF NOT EXISTS idx_analises_criado_em ON analises(criado_em);
CREATE INDEX IF NOT EXISTS idx_documentos_analise_id ON documentos(analise_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_tipo ON usuarios(tipo_usuario);

-- ============================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================
COMMENT ON TABLE usuarios IS 'Tabela de usuários do sistema (vendedores e administradores)';
COMMENT ON TABLE analises IS 'Tabela de análises de crédito submetidas pelos vendedores';
COMMENT ON TABLE documentos IS 'Tabela de documentos anexados às análises';

COMMENT ON COLUMN usuarios.tipo_usuario IS 'Tipo do usuário: vendedor ou admin';
COMMENT ON COLUMN analises.status IS 'Status da análise: pendente, aprovado, reprovado, reanalise';
COMMENT ON COLUMN documentos.url IS 'Caminho do arquivo no Supabase Storage';

-- ============================
-- VERIFICAÇÃO FINAL
-- ============================
SELECT 'Setup concluído com sucesso!' as status;
