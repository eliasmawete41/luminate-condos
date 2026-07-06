## Plano de Melhorias Gerais

Este é um conjunto amplo de mudanças. Proponho dividir em fases para entregar com qualidade, sem quebrar o que já funciona. Cada fase pode ser aprovada e implementada separadamente.

---

### Fase 1 — Perfil e Autenticação
- **Página de Perfil unificada** (`/perfil`) acessível por todos os papéis (admin, técnico, morador) com: dados pessoais, foto, alteração de senha, preferências de notificação.
- **Cadastro de Morador com verificação**:
  - Formulário de registo já existente na tela de login continua, mas passa a criar o utilizador com status `pendente_verificacao`.
  - Morador escolhe **Bloco + Unidade (nº da casa)** no cadastro.
  - Admin recebe notificação e aprova/rejeita numa nova secção "Aprovações Pendentes" em `/usuarios`.
  - Só após aprovação o morador consegue aceder ao painel.
- **Recuperação de conta com emails fictícios**:
  - Fluxo alternativo: morador informa email + nome completo + nº da unidade → sistema gera token temporário → admin visualiza pedidos pendentes e libera reset → morador define nova senha via link/token interno (sem depender de envio real de email).

### Fase 2 — Restrição por Rua/Bloco (Morador)
- Adicionar campo `rua` (ou usar `block_id`) na tabela `residents`/`units`.
- Morador só vê postes cuja `rua`/`bloco` corresponde à sua unidade.
- Aplicar via RLS + filtros no frontend (`/inicio`, mapa se acessível).

### Fase 3 — Relatórios (substitui Histórico)
- Renomear rota `/historico` → `/relatorios`.
- Tipos de relatório: **Ocorrências (avarias)**, **Manutenções**, **Geral**, **Moradores**.
- Filtros: tipo, status, **intervalo de datas** (date range), bloco/unidade.
- **Pré-visualização em tabela/cards antes de exportar**.
- Exportação em **PDF** (usando `jsPDF` + `jspdf-autotable`) com cabeçalho do condomínio.

### Fase 4 — Notificações Funcionais por Papel
- **Admin**: novas avarias reportadas, novos cadastros pendentes, avaliações recebidas.
- **Técnico**: novas ordens de manutenção atribuídas, atualizações de status.
- **Morador**: respostas do chat de suporte, status da sua avaria, avisos gerais.
- Sino no header abre dropdown com lista, marcação de lidas, contador de não lidas (Realtime).

### Fase 5 — Responsividade e Design
- Auditoria mobile em: Painel Admin, Painel Técnico, Painel Morador, Postes, Manutenções, Unidades, Usuários, Configurações, Mapa, Dispositivos.
- Correções: grids que quebram, tabelas com scroll horizontal, sidebar em mobile, cards empilhados, tipografia fluida.
- **Melhorias visuais**: imagens de qualidade (Unsplash/geradas) nos headers dos painéis, ícones ilustrativos, gradientes já existentes reforçados, espaçamento e hierarquia revistos.

---

### Como quero prosseguir
Este escopo é grande demais para uma única entrega. **Sugiro começar pela Fase 1 (Perfil + Verificação de morador + Recuperação alternativa)** por ser bloqueante para o resto, e depois seguir na ordem acima.

**Confirma que posso começar pela Fase 1?** Ou prefere outra ordem / quer que eu junte fases?