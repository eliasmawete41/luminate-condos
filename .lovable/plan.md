## Tradução completa do projeto para Português

### O que será traduzido

1. **Textos visíveis na UI** — verificar e traduzir o que ainda estiver em inglês em todas as páginas, layout e componentes.
2. **Comentários do código** — todos os comentários `//` e `/* */` em arquivos `.ts`/`.tsx`/SQL/Edge Functions.
3. **Identificadores internos** (variáveis, funções, tipos, props internos) onde for seguro renomear.
4. **Mensagens de log e toasts** que ainda estejam em inglês.

### Escopo dos arquivos

- `src/pages/*` (16 arquivos)
- `src/components/layout/*` (AppLayout, AppSidebar)
- `src/contexts/AuthContext.tsx`
- `src/components/NavLink.tsx`
- `supabase/functions/admin-create-user`, `create-admin`, `esp32-report`
- `src/hooks/use-toast.ts` (apenas comentários, é cópia do shadcn)
- `src/App.tsx`, `src/main.tsx`, `src/index.css` (comentários)

### O que NÃO será alterado (limitações técnicas)

Para evitar quebrar o projeto, os seguintes itens **permanecem em inglês**:

- **Componentes shadcn/ui** (`src/components/ui/*`) — são bibliotecas geradas, com nomes de props (`variant`, `size`, `disabled`, etc.) que fazem parte da API pública do Radix UI. Renomear quebra tudo.
- **Nomes de campos do Supabase** (`email`, `password`, `user_id`, `full_name`, `created_at`, `data`, `error`) — são contratos do banco/API. Renomear exigiria migrations destrutivas e quebraria o frontend.
- **Hooks e APIs do React/React Router** (`useState`, `useEffect`, `user`, `loading`, `navigate`) — não dá para renomear.
- **Nomes dos arquivos de página** (`Auth.tsx`, `Dashboard.tsx`, etc.) — já estão referenciados em rotas e imports; renomear arquivos é alto risco e o usuário só vê a URL, não o nome do arquivo.
- **Tabelas/colunas do Supabase** — manteremos os nomes atuais.

### Estratégia de execução

1. Auditar cada arquivo do escopo principal acima para listar trechos ainda em inglês.
2. Aplicar as traduções por arquivo, em lote, mantendo a funcionalidade.
3. Após cada arquivo, verificar console/preview rapidamente.

### Observação importante

A memória do projeto já diz que **tudo deve estar em PT** e a maior parte do código já foi traduzida ao longo das interações anteriores. Esta passagem será uma **revisão de varredura** para pegar resíduos em inglês — não uma reescrita total. Se você esperava renomear também os arquivos das páginas e os campos do banco, me avise para discutirmos o impacto antes.
