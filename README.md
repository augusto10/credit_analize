# Sistema de Análise de Crédito - Esplendor

Sistema web para análise de crédito com upload de documentos, desenvolvido com Next.js e Supabase.

## 🚀 Funcionalidades

### Para Vendedores
- ✅ Login seguro
- ✅ Criar nova análise de crédito
- ✅ Upload de documentos (PDF, JPG, PNG, DOC, DOCX)
- ✅ Acompanhar status das análises
- ✅ Reenviar documentos quando solicitado

### Para Administradores
- ✅ Painel completo com todas as análises
- ✅ Filtros por status (pendente, aprovado, reprovado, reanalise)
- ✅ Visualizar documentos com URLs temporárias seguras
- ✅ Aprovar/reprovar análises
- ✅ Solicitar documentos adicionais
- ✅ Dashboard com estatísticas

## 🛠️ Tecnologias

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Storage + Auth)
- **Deploy**: Vercel
- **Ícones**: Lucide React

## ⚙️ Configuração

### 1. Configurar Supabase

1. Crie uma conta em [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Vá em **SQL Editor** e execute o script `supabase/setup.sql`
4. Vá em **Storage** → **Create bucket** → nome: `documentos` → **Private**
5. Copie a URL do projeto e a chave anônima

### 2. Configurar variáveis de ambiente

1. Copie `.env.local.example` para `.env.local`
2. Preencha com suas credenciais do Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima
```

### 3. Instalar dependências

```bash
npm install
```

### 4. Executar localmente

```bash
npm run dev
```

Acesse: http://localhost:3000

## 👥 Usuários de Teste

O script SQL cria automaticamente usuários de teste:

- **Vendedor**: vendedor@teste.com / 123456
- **Admin**: admin@teste.com / 123456

## 🚀 Deploy no Vercel

1. Faça push do código para GitHub/GitLab
2. Conecte seu repositório no [vercel.com](https://vercel.com)
3. Adicione as variáveis de ambiente no painel da Vercel
4. Deploy automático! 🎉

## 📁 Estrutura do Projeto

```
├── app/
│   ├── admin/page.tsx          # Painel administrativo
│   ├── login/page.tsx          # Tela de login
│   ├── vendedor/page.tsx       # Painel do vendedor
│   ├── globals.css             # Estilos globais
│   ├── layout.tsx              # Layout principal
│   └── page.tsx                # Página inicial (redirect)
├── components/
│   ├── DocumentoUpload.tsx     # Componente de upload
│   └── Navbar.tsx              # Barra de navegação
├── lib/
│   ├── auth.ts                 # Serviços de autenticação
│   ├── database.types.ts       # Tipos TypeScript
│   └── supabase.ts             # Cliente Supabase
└── supabase/
    └── setup.sql               # Script de configuração do BD
```

## 🔒 Segurança

- Row Level Security (RLS) habilitado
- Vendedores só acessam suas próprias análises
- Documentos privados com URLs temporárias
- Autenticação obrigatória para todas as rotas

## 📝 Próximos Passos

- [ ] Implementar notificações por email
- [ ] Adicionar mais tipos de documento
- [ ] Relatórios e exportação
- [ ] Histórico de ações
- [ ] Integração com APIs de consulta de CPF/CNPJ
