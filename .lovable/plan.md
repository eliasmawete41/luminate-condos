## Objetivo

Criar um webhook público no Lovable Cloud que recebe POST do ESP32 em `/dispositivos`, guarda o histórico em tabela própria e mostra os valores em tempo real no dashboard.

## 1. Base de dados

Nova tabela `esp32_leituras` (histórico append-only, uma linha por POST):

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | default `gen_random_uuid()` |
| `ldr` | integer | |
| `poste_bom_status` | text | "LIGADO"/"DESLIGADO" |
| `corrente_poste_bom` | numeric | |
| `potencia_poste_bom` | numeric | |
| `poste_estragado_status` | text | |
| `corrente_poste_estragado` | numeric | |
| `potencia_poste_estragado` | numeric | |
| `created_at` | timestamptz default now() | |

RLS:
- `SELECT` permitido a `authenticated` (todos os utilizadores logados podem ver o monitoramento).
- `INSERT` apenas via `service_role` (a edge function escreve com service key; o ESP32 não fala diretamente com o Postgres).
- GRANTs: `SELECT` a authenticated, `ALL` a service_role.

Adicionar a tabela à publicação `supabase_realtime` para atualização ao vivo.

## 2. Edge Function `dispositivos`

Endpoint público (sem JWT) em `supabase/functions/dispositivos/index.ts`.

- Aceita `POST` com JSON exatamente na estrutura enviada pelo ESP32.
- Valida o body com Zod (campos e tipos esperados).
- Insere uma nova linha em `esp32_leituras` usando o `SUPABASE_SERVICE_ROLE_KEY`.
- Responde 200 `{ ok: true, id }` em sucesso, 400 em payload inválido, 500 em erro de DB.
- CORS habilitado (`OPTIONS` + headers em todas as respostas).
- Override em `supabase/config.toml` para `verify_jwt = false` nesta função.

URL final que o ESP32 deve usar: `https://<project>.functions.supabase.co/dispositivos` (mostrada ao utilizador após deploy).

## 3. Interface — Monitoramento em tempo real

Nova página `src/pages/MonitorDispositivos.tsx` (rota `/monitor-dispositivos`) ligada no menu lateral.

Layout:
- **Cards de estado atual** (última leitura):
  - LDR (luminosidade)
  - Poste Bom: estado (badge verde/cinza), corrente (A), potência (W)
  - Poste Estragado: estado, corrente, potência
- **Tabela de histórico** das últimas 50 leituras, com data/hora.

Dados:
- Hook `useLeiturasEsp32` que faz `select` inicial das últimas 50 linhas ordenadas por `created_at desc`.
- Subscrição Realtime ao canal `esp32_leituras` (evento `INSERT`) dentro de `useEffect`, com `removeChannel` no cleanup, para atualizar cards + prepend na tabela.

## 4. Detalhes técnicos

- Migração SQL única: CREATE TABLE → GRANT → ENABLE RLS → POLICIES → ALTER PUBLICATION.
- Edge function usa `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)` (já existem como secrets).
- Toda a UI e código em português, seguindo o tema visual existente (gradientes sunset, dark bg).
- Sem dados mock — só a leitura real da tabela.

## Ficheiros

Criar:
- `supabase/functions/dispositivos/index.ts`
- `src/pages/MonitorDispositivos.tsx`
- `src/hooks/useLeiturasEsp32.ts`

Editar:
- `supabase/config.toml` (bloco da função com `verify_jwt = false`)
- `src/App.tsx` (rota)
- Sidebar/menu para incluir o item "Monitoramento ESP32"
