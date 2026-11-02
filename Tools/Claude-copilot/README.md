# copilot-claude

Usa **Claude Code** (CLI e plugin VS Code) con i modelli esposti da **GitHub Copilot**.

```
Claude Code ──► filtro :4142 (shim.mjs) ──► copilot-api :4141 ──► GitHub Copilot
```

## Uso

```bash
claude-copilot claude [args]     # avvia (se serve) proxy + filtro e lancia claude nel terminale
claude-copilot code [cartella]   # idem, ma apre VS Code (chiudilo prima con Cmd+Q)
claude-copilot status            # stato di proxy e filtro
claude-copilot logs              # segue i log
claude-copilot stop              # spegne tutto
```

Modello iniziale: `claude-sonnet-5-5`, modello veloce: `claude-haiku-4-5`.
Si cambiano con variabili d'ambiente:

```bash
COPILOT_MODEL=claude-opus-5-5 claude-copilot claude
COPILOT_FAST_MODEL=claude-haiku-4-5 claude-copilot code ~/progetto
```

Dentro la sessione si può usare `/model` (anche dal menu). Per i modelli non Claude
usare il nome esatto Copilot, es. `/model gpt-6-sol`.

`claude` e `code` lanciati normalmente restano collegati ad Anthropic.

## File

| File | Ruolo |
|---|---|
| `claude-copilot` | script di gestione (collegato in `~/.local/bin/claude-copilot`) |
| `shim.mjs` | filtro HTTP tra Claude Code e copilot-api |
| `run/` | log di proxy e filtro (riscritti a ogni avvio, esclusi da git) |

## Cosa corregge il filtro (`shim.mjs`)

`copilot-api` 0.7.0 traduce le richieste Anthropic in formato OpenAI per Copilot, ma con
Claude Code 2.1.316 e i modelli Claude recenti ci sono tre incompatibilità:

1. **Messaggi `role: "system"` dentro `messages`** — Claude Code li invia (es. contesto
   d'ambiente); copilot-api li tratta come `assistant`, quindi Copilot risponde
   `400 This model does not support assistant message prefill`.
   → vengono uniti come testo al messaggio `user` precedente.
2. **Prefill vero** (ultimo messaggio `assistant`) — non supportato da Sonnet 5/5.5,
   Opus 4.8/5/5.5 su Copilot. → i messaggi `assistant` finali vengono rimossi.
3. **Nomi modello** — il menu di Claude Code usa i nomi Anthropic (`claude-opus-5-5`,
   `claude-haiku-4-5-20251001`), Copilot quelli con il punto (`claude-opus-5.5`).
   → conversione automatica (rimuove suffisso data e `[...]`, `X-Y` → `X.Y`).

Il filtro ascolta solo su `127.0.0.1`.

## Prerequisiti e setup

- Node.js (usato `npx copilot-api@0.7.0`, versione fissata)
- Claude Code CLI (`~/.local/bin/claude`) e/o plugin VS Code, comando `code` nel PATH
- Abbonamento GitHub Copilot

Primo avvio: `claude-copilot start` mostra un codice da inserire su
<https://github.com/login/device>. Il token viene salvato in `~/.local/share/copilot-api/`.

## Attenzione

- `copilot-api` non ha un'opzione host: la porta **4141 ascolta su tutte le interfacce**.
  Su reti condivise fare `claude-copilot stop` quando non serve.
- `copilot-api` non è ufficiale: l'uso può violare i termini di GitHub Copilot.
- Usare `/model` può salvare il modello come default in `~/.claude/settings.json`
  (chiave `"model"`): con un nome solo-Copilot `claude` normale darebbe errore → rimuovere la riga.
- VS Code deve essere chiuso del tutto prima di `claude-copilot code`, altrimenti
  l'istanza già aperta non riceve le variabili d'ambiente.

## Modelli Copilot disponibili (verificati il 2 nov 2026)

Claude: `claude-opus-5.5`, `claude-opus-5`, `claude-opus-4.8`, `claude-sonnet-5.5`,
`claude-sonnet-5`, `claude-haiku-5.5`, `claude-haiku-4.5` ·
OpenAI: `gpt-6.1-sol`, `gpt-6.1-terra`, `gpt-6-sol`, `gpt-6-luna`, `gpt-6-astra`,
`gpt-5.6-sol/luna/terra`, `gpt-5.3-codex`, `gpt-5.4-nano`, `gpt-4.1`, `gpt-4o`… ·
Google: `gemini-4-argon`, `gemini-3.8-flash` · xAI: `grok-4.7`, `grok-4.6` ·
Microsoft: `mai-code-1.1-flash`

Lista aggiornata: `curl -s http://localhost:4141/v1/models`
