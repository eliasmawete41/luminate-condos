## Plano para resolver o problema do ESP32

1. **Corrigir o endpoint `/dispositivos`**
   - Reescrever a função para aceitar também o caso comum em ESP32 em que o corpo chega como texto cru, com cabeçalhos incompletos ou sem `Content-Type: application/json`.
   - Extrair somente os campos reais enviados pelo chip:
     - `ldr`
     - `poste_bom_status`
     - `corrente_poste_bom`
     - `potencia_poste_bom`
     - `poste_estragado_status`
     - `corrente_poste_estragado`
     - `potencia_poste_estragado`
   - Remover qualquer fallback que possa mascarar dados ausentes como `0`/`DESLIGADO` sem avisar.
   - Retornar erro claro quando o JSON vier inválido ou sem os campos obrigatórios.

2. **Garantir que a função publicada é a versão certa**
   - Depois de alterar o código, publicar novamente a Edge Function `dispositivos`.
   - Testar o endpoint com um POST realista e confirmar que a linha aparece na tabela `esp32_leituras`.

3. **Fortalecer o painel `/monitor-esp32`**
   - Manter Realtime para novos registos.
   - Manter polling de 5 segundos como reserva.
   - Mostrar erro visível no painel quando a busca falhar, em vez de parecer que “não chegou nada”.
   - Evitar que o estado “Tempo real ligado” esconda uma tabela vazia quando o problema estiver no webhook.

4. **Limpar leituras de teste se necessário**
   - Depois de validar o endpoint com uma leitura controlada, remover apenas os registos de teste criados durante a validação, mantendo o histórico limpo para o ESP32 real.

## Detalhes técnicos

- A base de dados está saudável e a tabela `esp32_leituras` existe.
- A tabela está vazia neste momento, por isso o painel não tem nada para mostrar.
- Não há logs recentes da função `dispositivos`, o que indica que o ESP32 provavelmente não está a atingir a função publicada correta, ou a chamada está a falhar antes de inserir.
- A correção principal será tornar o endpoint mais compatível com requests de ESP32 e validar/deployar a função publicada.