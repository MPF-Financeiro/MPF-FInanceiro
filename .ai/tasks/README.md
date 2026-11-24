# .ai/tasks: handoff entre IAs

Cada tarefa de código ganha uma pasta `.ai/tasks/<slug>/` com a conversa técnica entre as IAs (Claude, Gemini e Codex), versionada junto com o código.

| Arquivo | Quem escreve | O quê |
|---|---|---|
| `spec.md` | Claude (skill `spec-first`) | Requisitos, fora de escopo, dados, contratos, critérios de aceite |
| `plan.md` | Claude (skill `task-planner`) | Passos de 1 a 3 arquivos, com aceite objetivo |
| `research.md` | Gemini (colado pelo João) | Documentação e pesquisa técnica, com fontes |
| `report.md` | Executor (Codex ou Claude Code) | O que foi feito e a prova dos checks (skill `verify-before-done`) |
| `review.md` | Outro modelo (skill `cross-model-review`) | Auditoria do diff contra a spec |

Como começar: copie `_modelo/` para `.ai/tasks/<slug>/` (slug curto, minúsculo, com hífens).

Regras: nada de segredo, senha, chave ou dado pessoal real nestes arquivos. Tarefa pequena (poucas linhas) não precisa de pasta. Protocolo completo em `docs/handoff-multi-ia.md` do repositório `joritodev/segundo-cerebro`.
