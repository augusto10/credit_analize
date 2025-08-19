# 🚀 INSTRUÇÕES PARA CONFIGURAR SUPABASE

## Item 2: Executar Script SQL

1. Acesse seu projeto Supabase: https://supabase.com/dashboard/projects
2. Vá em **SQL Editor** (ícone de banco de dados)
3. Clique em **New Query**
4. Cole TODO o conteúdo do arquivo `supabase/setup.sql` (239 linhas)
5. Clique em **RUN** para executar

## Item 3: Criar Bucket de Documentos

1. No mesmo projeto Supabase, vá em **Storage**
2. Clique em **Create bucket**
3. Nome: `documentos`
4. Marque como **Private** (importante para segurança)
5. Clique em **Create bucket**

## Verificação
Após executar:
- Vá em **Table Editor** → deve ver 3 tabelas: usuarios, analises, documentos
- Vá em **Storage** → deve ver bucket "documentos" 
- Usuários de teste criados automaticamente:
  - vendedor@teste.com / 123456
  - admin@teste.com / 123456

## Próximo Passo
Depois de configurar o Supabase, volte e execute: `npm run dev`
