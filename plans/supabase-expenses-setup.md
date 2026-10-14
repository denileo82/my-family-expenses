# Setup Supabase — Controle de Despesas

## Objetivo
App mobile-first de controle de despesas com Angular 20 + Tailwind 4 + Supabase, deployável no Bonto.

## Credenciais (usar publishable key no frontend)
- URL: `https://emitawneekkomsxrnphv.supabase.co`
- Publishable key: `sb_publishable_Rq5YhJv6JfJkELse4kVCFQ_n6O-37Gw`

## Passos

### 1. SQL no Supabase (executar no SQL Editor)
```sql
create table if not exists category (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  max_monthly_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists expense (
  id uuid primary key default gen_random_uuid(),
  name text,
  category_id uuid not null references category(id) on delete cascade,
  amount numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_expense_category on expense(category_id);
create index if not exists idx_expense_created_at on expense(created_at);

insert into category (name, max_monthly_amount) values
  ('Mercado', 0), ('Restaurante', 0), ('Padaria', 0), ('Doces', 0),
  ('Vestuário', 0), ('Farmácia', 0), ('Combustível', 0), ('Outro', 0)
on conflict (name) do nothing;

alter table category enable row level security;
alter table expense enable row level security;

create policy "public read categories" on category for select using (true);
create policy "public insert categories" on category for insert with check (true);
create policy "public update categories" on category for update using (true) with check (true);
create policy "public delete categories" on category for delete using (true);

create policy "public read expenses" on expense for select using (true);
create policy "public insert expenses" on expense for insert with check (true);
create policy "public update expenses" on expense for update using (true) with check (true);
create policy "public delete expenses" on expense for delete using (true);
```

### 2. Angular
- `npm install @supabase/supabase-js`
- `src/environments/environment.ts` com url + publishable key
- `src/app/supabase.client.ts` — client singleton
- Models: `Category { id, name, max_monthly_amount }`, `Expense { id, name, category_id, amount, created_at }`
- `CategoryService`: list, update max
- `ExpenseService`: list do mês atual (join categoria), insert, delete

### 3. UI (mobile-first, Tailwind)
- Grid de botões de categoria (2 colunas), cada botão mostra: nome, gasto atual / máximo, barra de progresso, "faltam R$ X" e "R$ X/dia" (restante ÷ dias restantes do mês)
- Input numérico grande de valor + botão "Adicionar" (insere expense na categoria selecionada)
- Lista das despesas do mês com delete
- Cores: verde (ok), amarelo (>70%), vermelho (estourado)

### 4. Validação
- `npm run build` + teste local com `node server.js`
- Commit + push para o Bonto
