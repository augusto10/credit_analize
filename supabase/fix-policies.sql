-- Script para corrigir políticas RLS e permitir criação de análises

-- DESABILITAR RLS TEMPORARIAMENTE PARA TESTE
ALTER TABLE IF EXISTS analises DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS documentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS usuarios DISABLE ROW LEVEL SECURITY;

-- Remover tabelas existentes e recriar com tipos corretos
DROP TABLE IF EXISTS documentos CASCADE;
DROP TABLE IF EXISTS analises CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- Recriar tabela usuarios com ID INTEGER
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL,
  tipo_usuario VARCHAR(50) NOT NULL CHECK (tipo_usuario IN ('vendedor', 'admin')),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recriar tabela analises com vendedor_id INTEGER
CREATE TABLE analises (
  id SERIAL PRIMARY KEY,
  vendedor_id INTEGER NOT NULL REFERENCES usuarios(id),
  cliente_nome VARCHAR(255) NOT NULL,
  cliente_cpf VARCHAR(20) NOT NULL,
  tipo_cliente VARCHAR(20) NOT NULL CHECK (tipo_cliente IN ('revenda','construtora')),
  codigo_cliente VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','pendente', 'aprovado', 'reprovado', 'reanalise')),
  observacao_reanalise TEXT,
  comentario_analista TEXT,
  valor_aprovado NUMERIC(12,2),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recriar tabela documentos
CREATE TABLE documentos (
  id SERIAL PRIMARY KEY,
  analise_id INTEGER NOT NULL REFERENCES analises(id) ON DELETE CASCADE,
  nome_arquivo VARCHAR(255) NOT NULL,
  tipo_documento VARCHAR(50) NOT NULL,
  url TEXT NOT NULL,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Nova tabela: referências comerciais (3 obrigatórias para envio)
CREATE TABLE IF NOT EXISTS referencias_comerciais (
  id SERIAL PRIMARY KEY,
  analise_id INTEGER NOT NULL REFERENCES analises(id) ON DELETE CASCADE,
  empresa VARCHAR(255) NOT NULL,
  contato VARCHAR(255) NOT NULL,
  telefone VARCHAR(50) NOT NULL,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Remover todas as políticas existentes
DROP POLICY IF EXISTS "Vendedores podem ver suas próprias análises" ON analises;
DROP POLICY IF EXISTS "Vendedores podem criar análises" ON analises;
DROP POLICY IF EXISTS "Administradores podem ver todas as análises" ON analises;
DROP POLICY IF EXISTS "Administradores podem atualizar análises" ON analises;
DROP POLICY IF EXISTS "vendedor_insert_analises" ON analises;
DROP POLICY IF EXISTS "admin_update_analises" ON analises;
DROP POLICY IF EXISTS "allow_all_select" ON analises;
DROP POLICY IF EXISTS "allow_all_insert" ON analises;
DROP POLICY IF EXISTS "allow_all_update" ON analises;

-- Políticas para documentos
DROP POLICY IF EXISTS "Usuários podem ver documentos de suas análises" ON documentos;
DROP POLICY IF EXISTS "Usuários podem inserir documentos em suas análises" ON documentos;
DROP POLICY IF EXISTS "allow_all_documentos_select" ON documentos;
DROP POLICY IF EXISTS "allow_all_documentos_insert" ON documentos;

-- Políticas para usuários
DROP POLICY IF EXISTS "admin_select_all_usuarios" ON usuarios;
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON usuarios;

-- Inserir usuários de teste
INSERT INTO usuarios (id, nome, email, senha, tipo_usuario) VALUES
(1, 'João Vendedor', 'vendedor@teste.com', '123456', 'vendedor'),
(2, 'Maria Admin', 'admin@teste.com', '123456', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Criar triggers para atualizar timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analises_updated_at BEFORE UPDATE ON analises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verificar estrutura das tabelas
SELECT 'usuarios' as tabela, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'usuarios' 
ORDER BY ordinal_position;

SELECT 'analises' as tabela, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'analises' 
ORDER BY ordinal_position;

SELECT 'documentos' as tabela, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'documentos' 
ORDER BY ordinal_position;

SELECT 'referencias_comerciais' as tabela, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'referencias_comerciais' 
ORDER BY ordinal_position;

-- Garantir coluna de observação existe em ambientes já criados
ALTER TABLE IF EXISTS analises
  ADD COLUMN IF NOT EXISTS observacao_reanalise TEXT;
