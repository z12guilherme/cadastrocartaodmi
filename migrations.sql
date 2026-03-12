-- Arquivo de Migração / Setup do Banco de Dados Supabase
-- Data: 2026-03-12

-- ---------------------------------------------------------
-- 1. TABELA DE INSCRIÇÕES
-- ---------------------------------------------------------

create table public.inscricoes (
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
  cargo text,      -- Ex: Pastor, Missionário, Membro
  congregacao text,
  distrito text,
  
  -- Arquivos (Caminhos salvos no Supabase Storage)
  foto_url text,
  assinatura_url text,
  anexo_documento_url text, -- Para RG/CPF digitalizado
  
  -- Controle Interno
  status text not null default 'pendente', -- pendente, aprovado, rejeitado
  valor text, -- Valor do plano/carteirinha
  observacoes text
);

-- Habilitar segurança a nível de linha (RLS)
alter table public.inscricoes enable row level security;

-- Políticas de Segurança (RLS)
create policy "Permitir cadastro público" on public.inscricoes for insert to public with check (true);
create policy "Admins podem ver tudo" on public.inscricoes for select to authenticated using (true);
create policy "Admins podem editar" on public.inscricoes for update to authenticated using (true);
create policy "Admins podem excluir" on public.inscricoes for delete to authenticated using (true);

-- Index Opcional
create index idx_inscricoes_cpf on public.inscricoes(cpf);

-- ---------------------------------------------------------
-- 2. CONFIGURAÇÃO DE STORAGE (BUCKET 'documentos')
-- ---------------------------------------------------------

-- Cria bucket 'documentos' (Privado por padrão)
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false);

-- !!! IMPORTANTE: Execute as linhas abaixo no SQL Editor para corrigir o erro de RLS !!!

-- 1. Limpar políticas antigas para evitar conflitos/duplicações
drop policy if exists "Permitir Upload Publico" on storage.objects;
drop policy if exists "Permitir Atualizacao Publico" on storage.objects;
drop policy if exists "Permitir Visulizacao Admin" on storage.objects;

-- 2. Recriar políticas com permissões explícitas
create policy "Permitir Upload Publico" on storage.objects for insert to public with check ( bucket_id = 'documentos' );

create policy "Permitir Atualizacao Publico" on storage.objects for update to public using ( bucket_id = 'documentos' );

create policy "Permitir Visulizacao Admin" on storage.objects for select to authenticated using ( bucket_id = 'documentos' );

-- ---------------------------------------------------------
-- 3. CORREÇÃO DE PERMISSÕES DE ADMIN (UPDATE/DELETE)
-- ---------------------------------------------------------

-- Execute estas linhas para garantir que o Admin possa aprovar e excluir
drop policy if exists "Admins podem excluir" on public.inscricoes;
create policy "Admins podem excluir" on public.inscricoes for delete to authenticated using (true);

-- ---------------------------------------------------------
-- 4. ATUALIZAÇÃO: ADICIONAR CAMPO 'VALOR'
-- ---------------------------------------------------------

alter table public.inscricoes add column if not exists valor text;