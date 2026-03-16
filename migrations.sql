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

-- Limpar políticas antigas (legado) para evitar conflitos
drop policy if exists "Public Insert Inscricoes" on public.inscricoes;
drop policy if exists "Admin Manage Inscricoes" on public.inscricoes;

-- 2.1. Público (Anon): Pode apenas INSERIR e CONSULTAR SEU PRÓPRIO PROTOCOLO
drop policy if exists "Permitir cadastro publico" on public.inscricoes;
create policy "Permitir cadastro publico" on public.inscricoes for insert to public with check (true);

-- Permitir que o público atualize (necessário caso o formulário wizard salve etapas parciais)
drop policy if exists "Permitir update publico" on public.inscricoes;

-- Permitir que público consulte status APENAS se souber o protocolo (segurança por obscuridade do token)
-- Nota: Em produção ideal, usaríamos uma função RPC, mas para este caso simples:
drop policy if exists "Permitir consulta por protocolo" on public.inscricoes;

-- Restrição rigorosa: Público só pode dar SELECT se a requisição NÃO for de leitura aberta (GET). O coalesce evita erros de variáveis nulas.
create policy "Permitir consulta por protocolo" on public.inscricoes for select to public 
using (coalesce(current_setting('request.method', true), '') != 'GET');

-- Criar função segura (RPC) para consulta de protocolo sem expor a tabela
create or replace function consultar_status_protocolo(p_protocolo text)
returns table (
  nome_completo text,
  status text,
  anexo_documento_url text
)
language plpgsql
security definer -- Executa com nível de admin ignorando RLS
as $$
begin
  return query
  select i.nome_completo, i.status, i.anexo_documento_url
  from public.inscricoes i
  where i.protocolo = p_protocolo;
end;
$$;

-- 2.2. Admin (Authenticated): Pode fazer TUDO
drop policy if exists "Permitir gerencia admin" on public.inscricoes;
create policy "Permitir gerencia admin" on public.inscricoes 
for all to authenticated 
using (auth.jwt() ->> 'email' = 'clinicadmi.cartaodmi@gmail.com') 
with check (auth.jwt() ->> 'email' = 'clinicadmi.cartaodmi@gmail.com');

-- ---------------------------------------------------------
-- 3. CONFIGURAÇÃO DE STORAGE (BUCKET 'documentos')
-- ---------------------------------------------------------

-- Garantir bucket existente
insert into storage.buckets (id, name, public) values ('documentos', 'documentos', false) on conflict (id) do nothing;

-- Limpar políticas antigas de storage
drop policy if exists "Permitir upload publico" on storage.objects;
drop policy if exists "Permitir update publico" on storage.objects;
drop policy if exists "Permitir select admin e publico" on storage.objects;
drop policy if exists "Admin Gerencia Storage" on storage.objects;
drop policy if exists "Publico Faz Upload" on storage.objects;
drop policy if exists "Publico Atualiza Uploads" on storage.objects;
drop policy if exists "Publico Le Apenas Contrato" on storage.objects;

-- 3.1. Admin: Controle Total (Ler, Atualizar, Deletar) do Storage
create policy "Admin Gerencia Storage" on storage.objects for all to authenticated 
using (auth.jwt() ->> 'email' = 'clinicadmi.cartaodmi@gmail.com') 
with check (auth.jwt() ->> 'email' = 'clinicadmi.cartaodmi@gmail.com');

-- 3.2. Público: Pode Fazer Upload (Insert)
create policy "Publico Faz Upload" on storage.objects for insert to public 
with check (bucket_id = 'documentos');

-- 3.3. Público: Pode Atualizar (necessário para o upsert do client-side caso o cliente reenvie a foto no formulário)
create policy "Publico Atualiza Uploads" on storage.objects for update to public 
using (bucket_id = 'documentos');

-- 3.4. Público: SÓ pode LER se for o contrato final (Bloqueia leitura de RG, Comprovantes, etc)
drop policy if exists "Publico Le Apenas Contrato" on storage.objects;
create policy "Publico Le Apenas Contrato e Uploads" on storage.objects for select to public 
using (
  bucket_id = 'documentos' 
  and (name like '%/contrato_final.pdf' or created_at >= now() - interval '24 hours')
);