# Super Máquina de Conteúdo v0.2.3

## Jev / OpenRouter

- Integra `~typesafe/jev-latest` pela OpenRouter Decisions API (`/api/alpha/decisions`).
- Usa a mesma chave OpenRouter já cadastrada no backend.
- Adiciona classificação de complexidade antes da geração.
- Tarefas simples e com alta confiança podem priorizar o modelo mais econômico já disponível no plano.
- Em baixa confiança, necessidade de fatos externos ou tarefa avançada, preserva a ordem de modelos mais fortes.
- Após a geração, Jev valida aderência ao briefing, risco de afirmações não sustentadas, formato e naturalidade.
- Quando a validação falha e existe modelo mais forte, executa uma única escalada e revalida.
- Se Jev estiver indisponível, a geração continua pelo fluxo anterior, sem derrubar a aplicação.
- Custos do Jev são registrados junto dos custos reais do provedor.

## Controles

Variáveis opcionais:
- `SMC_JEV_MODEL` (padrão `~typesafe/jev-latest`)
- `SMC_JEV_DISABLED=1` para desligar a camada sem remover código
- `SMC_JEV_ROUTE_CONFIDENCE` (padrão `0.70`)
- `SMC_JEV_MIN_COMPLIANCE` (padrão `0.70`)
- `SMC_JEV_MAX_UNSUPPORTED` (padrão `0.30`)

Os limiares são iniciais para LAB e devem ser calibrados com tarefas reais antes de uso amplo.
