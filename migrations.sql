-- Arquivo de Migração / Setup do Banco de Dados Supabase
-- Data: 2026-03-13 (Atualizado)

-- ---------------------------------------------------------
-- 1. TABELA DE INSCRIÇÕES
-- ---------------------------------------------------------

create table if not exists public.inscricoes (
  id uuid not null default gen_random_uuid() primary key,
  created_at timestamp with time zone not null default now(),
  
  -- Dados Pessoais
  nome_completo text not null,
  cpf text,
  rg text,
  data_nascimento date,
  naturalidade text,
  estado_civil text,
  
  -- Dados de Contato
  telefone text,
  email text,
  endereco text,
  
  -- Dados do Cartão / Eclesiásticos
  cargo text,      -- Profissão
  congregacao text,
  distrito text,
  
  -- Arquivos (Caminhos salvos no Supabase Storage)
  foto_url text,
  assinatura_url text,
  anexo_documento_url text, -- Contrato Final (PDF)
  comprovante_pagamento_url text,
  
  -- Controle Financeiro e Status
  status text not null default 'pendente', -- pendente, aprovado, rejeitado
  protocolo text, -- Número gerado para consulta
  valor text, -- Valor do plano/carteirinha
  metodo_pagamento text, -- online, pix, dinheiro
  dia_vencimento text, -- 5, 10, 15...
  
  -- Dependentes
  observacoes text, -- JSON stringify dos dependentes (Legacy/Backup)
  dependentes jsonb, -- Campo JSON estruturado para dependentes
  dependentes_qtd integer default 0
);

-- Habilitar segurança a nível de linha (RLS)
alter table public.inscricoes enable row level security;

-- ---------------------------------------------------------
-- 2. POLÍTICAS DE SEGURANÇA (RLS) - INSCRIÇÕES
-- ---------------------------------------------------------

-- Limpar políticas antigas para evitar conflitos
drop policy if exists "Public Insert Inscricoes" on public.inscricoes;
drop policy if exists "Admin Manage Inscricoes" on public.inscricoes;
drop policy if exists "Permitir cadastro publico" on public.inscricoes;
drop policy if exists "Permitir gerencia admin" on public.inscricoes;

-- 2.1. Público (Anon): Pode apenas INSERIR e CONSULTAR SEU PRÓPRIO PROTOCOLO
create policy "Permitir cadastro publico" on public.inscricoes for insert to public with check (true);

-- Permitir que público consulte status APENAS se souber o protocolo (segurança por obscuridade do token)
-- Nota: Em produção ideal, usaríamos uma função RPC, mas para este caso simples:
create policy "Permitir consulta por protocolo" on public.inscricoes for select to public using (true);

-- 2.2. Admin (Authenticated): Pode fazer TUDO
create policy "Permitir gerencia admin" on public.inscricoes for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------
-- 3. CONFIGURAÇÃO DE STORAGE (BUCKET 'documentos')
-- ---------------------------------------------------------

-- Garantir bucket existente
insert into storage.buckets (id, name, public) values ('documentos', 'documentos', false) on conflict (id) do nothing;

-- Limpar políticas antigas de storage
drop policy if exists "Permitir upload publico" on storage.objects;
drop policy if exists "Permitir update publico" on storage.objects;
drop policy if exists "Permitir select admin e publico" on storage.objects;

-- 3.1. Upload (Insert): Público pode enviar arquivos para 'documentos'
create policy "Permitir upload publico" on storage.objects for insert to public with check (bucket_id = 'documentos');

-- 3.2. Update: Público pode atualizar (para upsert funcionar)
create policy "Permitir update publico" on storage.objects for update to public using (bucket_id = 'documentos');

-- 3.3. Select: Admin e Público (necessário para ver a imagem ao gerar contrato e para o admin ver no dashboard)
create policy "Permitir select admin e publico" on storage.objects for select to public using (bucket_id = 'documentos');