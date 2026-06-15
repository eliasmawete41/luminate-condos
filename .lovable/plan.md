## Objetivo
Criar um diagrama de caso de uso (use case diagram) em formato Mermaid representando todas as funcionalidades disponíveis ao papel de **administrador** no sistema PosteGuard, e salvá-lo como arquivo `.mmd` na pasta do projeto (sem integração na UI).

## Funcionalidades a incluir (com base no codebase)

O ator será **Administrador**.

Os casos de uso serão agrupados em subsistemas:

### Monitoramento
- Visualizar Dashboard (painel geral)
- Gerenciar Postes (listar, editar status, excluir)
- Visualizar Mapa (geolocalização dos postes)
- Visualizar Histórico (ocorrências resolvidas)

### Manutenção
- Gerenciar Ordens de Manutenção (criar, acompanhar, encerrar)

### Usuários
- Visualizar Usuários
- Cadastrar Usuários
- Alterar Perfil de Usuários

### Dispositivos IoT
- Gerenciar Dispositivos ESP32 (monitorar leituras, status)

### Suporte e Comunicação
- Visualizar Todas as Conversas de Suporte
- Responder a Solicitações de Moradores
- Visualizar Notificações

### Sistema
- Configurar Sistema / Perfil
- Alterar Senha

## Formato de entrega
- Arquivo: `diagrama-caso-de-uso-admin.mmd`
- Local: `/mnt/documents/` (para preview e download do usuário)
- Também copiado para a raiz do projeto para persistência no repositório

## Nota
O diagrama não será integrado à aplicação React — é apenas um artefato de documentação na pasta do projeto...ário.