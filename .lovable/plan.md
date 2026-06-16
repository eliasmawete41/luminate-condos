## Objetivo

Gerar dois diagramas da base de dados como artefactos de documentação (não integrados na UI), seguindo o mesmo padrão do diagrama de casos de uso já existente em `docs/`.

## Entregáveis

1. **`docs/modelo-conceptual-bd.mmd`** — Modelo Conceptual (alto nível, orientado ao negócio)
   - Diagrama Mermaid `erDiagram` com as entidades principais e seus relacionamentos, sem tipos de dados nem detalhes técnicos.
   - Entidades: Utilizador, Perfil, Papel, Morador, Unidade, Bloco, Poste, Dispositivo ESP32, Leitura, Manutenção, Substituição de Componente, Manutenção Preventiva, Conversa de Suporte, Mensagem, Avaliação, Notificação, Histórico do Morador, Configurações do Condomínio.
   - Relacionamentos com cardinalidade (1:1, 1:N, N:M) e verbos de negócio (ex.: "Morador reside em Unidade", "Poste possui Dispositivo", "Manutenção refere-se a Poste").

2. **`docs/modelo-logico-bd.mmd`** — Modelo Lógico (relacional, próximo da implementação)
   - Diagrama Mermaid `erDiagram` com **todas as tabelas reais** do schema `public`:
     `profiles`, `user_roles`, `blocks`, `units`, `residents`, `resident_history`, `poles`, `esp32_devices`, `device_readings`, `maintenances`, `component_replacements`, `preventive_schedules`, `support_conversations`, `support_messages`, `evaluations`, `notifications`, `condo_settings`.
   - Cada tabela com colunas, tipos (uuid, text, timestamptz, numeric, boolean, jsonb, enum) e marcação PK/FK.
   - Relacionamentos derivados das colunas `*_id` (ex.: `units.block_id → blocks.id`, `maintenances.pole_id → poles.id`, `support_messages.conversation_id → support_conversations.id`, etc.), com cardinalidades.

## Notas

- Ambos os ficheiros são apenas documentação Mermaid em `docs/`, sem alterações de código ou schema.
- Conteúdo (rótulos, entidades, comentários) em português, conforme convenção do projeto.
- Após criação, os diagramas serão também expostos via `<lov-artifact>` para visualização/download.
