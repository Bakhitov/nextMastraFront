## [Unreleased]

- chore(repo): добавлен `.gitignore` для исключения `.env*` (секреты не попадают в репозиторий)

- mastra/src/tools/n8n-admin.ts: добавлены HTTP-тулзы Mastra для n8n API (пул `n8nProTools`)
  - Credentials: `n8n_credentials_list`, `n8n_credentials_get`, `n8n_credentials_create`, `n8n_credentials_update`, `n8n_credentials_delete`
  - Variables: `n8n_variables_list`, `n8n_variables_create`, `n8n_variables_update`, `n8n_variables_delete`
  - Tags: `n8n_tags_list`, `n8n_tags_create`, `n8n_tags_update`, `n8n_tags_delete`
  - Source Control (Enterprise): `n8n_source_control_status`, `n8n_source_control_pull`, `n8n_source_control_push`
  - Workflow state: `n8n_workflow_activate`, `n8n_workflow_deactivate`
- mastra/src/agents/n8n-agent.ts: подключены новые тулзы (`n8nAdminTools`) к агенту вместе с MCP-тулзами.
  - Переименованы и подключены как `n8nProTools`. Доступ к `n8nProTools` ограничен по роли: только при `role === 'pro'`.

- extension/src/lib/llm-providers.ts: Переименованы лейблы провайдеров, чтобы избежать одинаковых названий; для Google — единый id `google`, лейблы различаются (Generative AI / Vertex AI).
- extension/src/background.ts: Унифицирован BASE_URL; при получении существующего треда теперь кэшируется `threadId:n8nAgent:<userId>`; токен читается как `sb-access-token` с фолбэком на `accessToken`.
- extension/src/popup/pages/chats/Chats.tsx: Добавлена обработка 401 — очистка стора и редирект на логин.
- extension/src/popup/pages/chats/ChatThread.tsx: Единый выбор токена (`sb-access-token` или `accessToken`) для стрима; обработка 401 (очистка стора и редирект); обработка удаления треда с 401.
- extension/src/popup/pages/settings/Settings.tsx: Обработка 401 при сохранении профиля (очистка стора и редирект).
  Также добавлено условное отображение и отправка полей n8n только для пользователей с `role=pro`.
  Поля n8n теперь всегда видимы, но `disabled` для не-PRO.
- front/shared/src/index.ts: Добавлен класс HttpError с сохранением статуса; теперь ошибки HTTP содержат `status`, чтобы UI мог обрабатывать 401.
 - extension: добавлены фильтры доступа по is_active
   - extension/src/popup/pages/chats/Chats.tsx: единый запрос профиля при монтировании — синхронизация полей и проверка `is_active`; при false — редирект на `/settings`. Проверка при создании/удалении тредов.
   - extension/src/popup/pages/chats/ChatThread.tsx: единый запрос профиля при монтировании — синхронизация полей и проверка `is_active`; при false — редирект на `/settings`. Проверка перед отправкой/удалением/созданием нового треда.
   - extension/src/background.ts: в обработчике контекстного меню проверяется `is_active` (из стора или свежий `/api/v1/users/me`); при false — не отправлять запросы агенту.
   - extension/src/content.ts: по клику на кнопку панели — проверка `is_active`; при false — предупредить пользователя и не открывать панель.
   - extension/src/lib/api.ts: в тип профиля добавлены поля `role`, `is_active`, `type_agent`.
- mastra/src/tools/mcp.ts: в окружение процесса `n8n-mcp` добавлена переменная `N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE` (берётся из `process.env`, по умолчанию "true").

## 2025-08-23

- feat(agent/tools): префикс `agent_` для всех инструментов в инструкциях и отрисовке (соответствие MCP). Core-инструменты для role=free теперь отображаются и вызываются как `agent_tools_documentation`, `agent_list_nodes`, `agent_get_node_info`, `agent_get_node_essentials`, `agent_search_nodes`, `agent_search_node_properties`, `agent_list_ai_tools`, `agent_get_node_as_tool_info`.
## 2025-08-17

- Added `next.config.ts` with `serverExternalPackages: ["@mastra/*"]` per Mastra Next.js guide.
- Added `tsconfig.json` excluding `.mastra` and optimized for Next.js + Mastra.
- Updated `package.json` scripts: `dev`, `build`, `start`, `dev:mastra`, `build:mastra`.
- Created Next.js App Router scaffolding: `app/layout.tsx`, `app/page.tsx`.
- Created test integration pages: `app/test/action.ts`, `app/test/form.tsx`, `app/test/page.tsx` using `mastra.getAgent("n8nAgent")`.
- Ensured Mastra entry at `src/mastra/index.ts` exists and uses `LibSQLStore` and `PinoLogger`.
- Added `.gitignore` entries including `.mastra`.

- Installed `@mastra/client-js` and added browser client at `lib/mastra/mastra-client.ts`.
- Replaced test page with streaming chat UI: `app/test/Chat.tsx` and updated `app/test/page.tsx` to load it.
- Added `app/globals.css` with modern chat styling and linked it from `app/layout.tsx`.
- Chat now uses Mastra memory: passes `threadId` as `n8n_agent_<timestamp>` and `resourceid` as `test` in agent.stream.
- Added chat list and thread pages:
  - `app/chats/page.tsx` — список тредов (получение через `mastraClient.getMemoryThreads`), кнопки «Создать чат» и «Удалить»
  - `app/chats/[threadId]/page.tsx` — чат по треду (загрузка истории, отправка сообщений со streaming)
  - Обновлён `app/page.tsx` с ссылками на разделы
- Unified storage: set `src/mastra/index.ts` storage to `file:../mastra.db` to persist threads/messages, matching agent memory store.

- Added API endpoint for extension auth: `app/api/v1/auth/login/route.ts` returning JWT (Bearer) for extension usage.
- Enabled CORS headers for `api/v1/*` in `next.config.ts` to allow extension requests during development.
- Added proxy endpoint `app/api/v1/mastra/[...path]/route.ts` to forward extension calls to Mastra server (`MASTRA_BASE_URL` or `http://localhost:4111`).

## 2025-08-19

- extension: нормализация результатов тулзов MCP в UI чата
  - Изменён `extension/src/popup/pages/chats/ChatThread.tsx`: добавлена функция `normalizeToolResult`, которая:
    - берёт `structuredContent`, если он присутствует в результате;
    - парсит JSON из `content[].text`, если там строка с JSON, иначе возвращает исходный текст;
  - Применено при загрузке истории (`tool-result`, `tool-invocation`) и при стриминге (`addToolResult`) для отображения читабельного структурированного JSON вместо сырой строки.
 - extension: визуальные правки для инструментов в чате
   - Изменён `extension/src/styles.css`: стилизован `acc-trigger` как кнопка со стрелкой; добавлены `tool-panel` для визуального отделения содержимого аккордеона от чата.
  - Обновлён `extension/src/popup/pages/chats/ChatThread.tsx`: содержимое аккордеона обёрнуто в `div.tool-panel`.
- Installed `jsonwebtoken` and `@types/jsonwebtoken` for extension login endpoint JWT issuance.
- Structured monorepo split:
  - Moved extension to `apps/extension` with MV3 manifest, Vite config, React Router pages (login/register/chats/thread) and background service worker
  - Added shared package `packages/shared` with typed API client
  - Updated `pnpm-workspace.yaml` to include `apps/*` and `packages/*`
  - Added Bearer JWT verification in `app/api/v1/mastra/[...path]/route.ts` proxy

- Added first-party endpoints for extension:
  - `app/api/v1/threads` (GET list, POST create)
  - `app/api/v1/threads/[id]` (GET details, DELETE)
  - `app/api/v1/threads/[id]/messages` (GET messages)
  - `app/api/v1/agents/[agentId]/stream` (POST streaming chat)
  - Updated extension pages to call these endpoints


### Split to extension-only UI and n8n styling

- Removed Next.js UI pages to keep only APIs (extension-only project):
  - Deleted `app/page.tsx`, `app/layout.tsx`, `app/providers.tsx`
  - Deleted `app/auth/login/page.tsx`, `app/auth/register/page.tsx`
  - Deleted `app/chats/page.tsx`, `app/chats/[threadId]/page.tsx`
  - Deleted test UI files `app/test/page.tsx`, `app/test/Chat.tsx`, `app/test/action.ts`, `app/test/form.tsx`
- Extension UI restyled to n8n-like light theme:
  - `apps/extension/src/styles.css`: introduced n8n palette (bg, panel, accent `#00c2a8`) and components (header, cards, list, chat)
  - `apps/extension/src/content.ts`: switched in-page panel/button to light theme, n8n accent, hover states
  
- Mastra separated as external service:
  - `lib/mastra/mastra-client.ts` now reads `MASTRA_BASE_URL` (defaults to `http://localhost:4111`)
  - API proxy `/api/v1/mastra/*` continues to forward to the same base

### Fix: Next.js vendor-chunk error (semver)

- Updated `next.config.ts`: removed `serverExternalPackages: ["@mastra/*"]` to prevent broken vendor chunk resolution like `./vendor-chunks/semver@7.7.2.js` in server runtime.
- Action required: clean build cache and restart dev server:
  - delete `.next` and `node_modules/.cache` if exists
  - run `pnpm dev`

## 2025-08-19

- front/web/app/api/v1/threads/route.ts: switched auth to Supabase SDK `auth.getUser(token)`; added diagnostic logs for GET/POST.
- front/web/lib/auth/verify.ts: removed JWKS verification; implemented Supabase SDK verification; added fallback JWKS fetch with headers earlier, then replaced by SDK.
- extension/src/background.ts: cache `threadId` per `agentId:userId`; include `resourceId` in stream body.
- extension/src/popup/pages/chats/Chats.tsx: normalize thread id as `id || threadId`.
- extension/src/popup/pages/chats/ChatThread.tsx: include `resourceId` in stream body.
- front/web/package.json: attempted bump `@mastra/client-js` to `^0.13.2`, but reverted to `^0.10.21` due to unavailable version in registry.

## 2025-08-19

- Fix: unified token verification in `front/web/app/api/v1/threads/route.ts` to use Supabase JWKS via `lib/auth/verify.ts` (previously used `jsonwebtoken` with `NEXTAUTH_SECRET`).
- Impact: extension requests to `/api/v1/threads` with Supabase access token now pass verification; 400 due to Unauthorized should be resolved when `resourceId` and `agentId` are provided.

### 2025-08-19

- mastra/src/tools/weather-tool.ts: align `createTool.execute` signature with Mastra docs — use `{ context }` instead of `{ input }`, read `context.location` to avoid `Cannot read properties of undefined (reading 'location')` during tool execution.
- mastra/src/tools/weather-tool.ts: emit vNext-friendly tool events via writer (pending/success) to surface tool activity in stream.
- front/web/app/api/v1/agents/[agentId]/stream/route.ts: make memory handling robust and native to Mastra:
  - accept `memory.thread`/`memory.resource` if provided
  - fallback to top-level `threadId`/`resourceId` and auth `sub`
  - always pass `{ memory: { thread, resource, options } }` to `agent.stream`
- extension/src/popup/pages/chats/ChatThread.tsx: move rendered Tools block above chat messages so tool annotations show first (tools execute before assistant response), matches modern chat UX.

### vNext streaming & UX

- front/web/app/api/v1/agents/[agentId]/stream-vnext/route.ts: added vNext SSE proxy using `agent.streamVNext`, with unified memory handling.
- extension/src/popup/pages/chats/ChatThread.tsx: switch to vNext endpoint and add minimal parser for `data:` frames with `{ type, payload }` to render `tool-call`/`tool-result` events and text deltas.
- mastra/src/agents/weather-agent.ts: enabled step indicators (`onStepFinish`) and lightweight telemetry for streaming runs.
### 2025-08-19 (streaming fixes)

- front/web/app/api/v1/agents/[agentId]/stream-vnext/route.ts: использован `agent.streamVNext({ savePerStep: true })` вместо обычного `stream`, чтобы проксировать события vNext (text-delta, tool-call, tool-result и кастомные writer-события) с корректными SSE заголовками.
  - Добавлен безопасный фолбэк: если `streamVNext` отсутствует в текущей версии SDK, используем `agent.stream` (устранена TS-ошибка и обеспечена совместимость).
- extension/src/popup/pages/chats/ChatThread.tsx:
  - Привязка инструментов к сообщению ассистента через `messageId` и рендер прямо над соответствующим сообщением.
  - При восстановлении истории pending tool events, встретившиеся до ассистентского сообщения, прикрепляются к следующему ассистентскому; остаток — к последнему ассистентскому.
  - В стрим-обработчике tool-result ищется соответствующая pending запись по `toolName` и текущему `assistantId`.
  - Добавлена поддержка кадров `9:` (tool-call) и `a:` (tool-result) из AI SDK, и игнор завершения с `finishReason: "tool-calls"` для продолжения стрима текста после выполнения инструментов.


- extension UI styling normalization:
### UI headers

- extension/src/popup/Layout.tsx: шапка заменена на "Agent N8N by crafty v0.1".
- extension/src/content.ts: заголовок панели и кнопка запуска изменены на "Agent N8N by crafty v0.1" (вместо "Mastra").
 - extension/src/popup/Layout.tsx: удалён header; контент растянут на всю высоту (main: h-full).
  - extension/src/styles.css: enabled Tailwind layers with `@tailwind base/components/utilities` to ensure utility classes are available in popup; left custom CSS tokens/classes.
  - extension/src/components/ui/button.tsx: map shadcn variants to project CSS classes (`btn`, `btn-primary`, `btn-danger`, `btn` outline) for consistent look.
  - extension/src/components/ui/card.tsx and popup/Layout.tsx: use `card`/`card-body` classes to match custom design everywhere, not только в модалке/чате.
  - extension/src/components/ui/input.tsx: align to shared `input` class for consistent focus/placeholder styles.

### 2025-08-19

- mastra/package.json: добавлен параллельный запуск `npx n8n-mcp` при старте Mastra.
  - Новый скрипт `mcp`: запускает `npx n8n-mcp`.
  - Обновлён скрипт `dev`: использует `concurrently` для одновременного запуска `mcp` и `mastra dev --dir src` с флагом `-k` для корректного завершения обоих процессов.
  - Добавлена dev-зависимость `concurrently@^8.2.2`.

- Прод: упрощён запуск Mastra с MCP без двойного старта
  - `mastra/package.json`: скрипты `dev` и `start` больше не запускают `pnpm mcp` параллельно; стартуем только Mastra (`mastra dev|start`).
  - MCP запускается через stdio по требованию из `MCPClient` (`mastra/src/tools/mcp.ts`), исключая ситуацию двойного `npx`.
  - Корневой `package.json`: `start:mastra` остаётся без изменений (проксирует на `mastra start`).

- MCP клиента настроили по Mastra docs:
  - `mastra/src/tools/mcp.ts`: локальный stdio сервер `n8n-mcp` через `npx n8n-mcp` с тихим логированием, готов к параллельному запуску из скриптов.
  - Создан агент `mastra/src/agents/n8n-agent.ts` с рабочей памятью, отключённой семантической памятью по умолчанию и подключёнными MCP-инструментами `await mcp.getTools()`; использует наше общее `storage` (Postgres via `@mastra/pg`).
  - `mastra/src/index.ts`: зарегистрирован `n8nAgent` вместо `weatherAgent`.

### 2025-08-19

- extension локальные настройки агента:
  - Добавлен `extension/src/lib/prefs.ts` — модуль для чтения/записи локальных предпочтений агента (`model_llm`, `api_key_llm`, `provider_llm`, `api_key_by_type`, `url_by_type`, `role`, `is_active`, `type_agent`).
  - Добавлена страница настроек `extension/src/popup/pages/settings/Settings.tsx` c формой редактирования.
    - Из интерфейса скрыты `is_active`, `type_agent`, `role` (редактируются админом).
    - Перед каждым инпутом добавлены заголовки, поля разделены на блоки “LLM” и “By Type”.
    - В секции LLM меняем порядок: Провайдер → API ключ → Модель; нижние кнопки "Отмена/Сохранить" удалены (остались в верхней панели).
    - После успешной регистрации теперь автоматически открывается страница настроек `/settings`.
    - Провайдер теперь выбирается из списка, модели подтягиваются по выбранному провайдеру, поле API ключ показывается только после выбора модели.
    - В настройках добавлен отступ между секциями LLM и n8n, а перед n8n-полями показан заголовок "Доступно по подписке PRO".
    - Добавлены ссылки для связи с менеджером: Telegram (`tg://resolve?phone=77066318623`) и WhatsApp (`https://wa.me/77066318623`).
  - Включён маршрут `/settings` в `extension/src/popup/App.tsx` и кнопка перехода в `extension/src/popup/pages/chats/Chats.tsx`.

## 2025-08-19

- feat(mastra): динамика LLM и MCP по профилю пользователя
  - `mastra/src/tools/mcp.ts`: удалён хардкод ключей/URL; добавлен `createMcpClient({ n8nApiUrl, n8nApiKey })` для per-request MCP
  - `mastra/src/agents/n8n-agent.ts`: 
    - модель выбирается из `runtimeContext`: `provider_llm`, `api_key_llm`, `model_llm` (openai/google/anthropic) с дефолтом openai gpt-4.1
    - MCP теперь подключается всегда: для PRO — `url_by_type`/`api_key_by_type`, для остальных — из `process.env.N8N_API_URL`/`N8N_API_KEY` (если заданы); иначе инструменты пустые
  - API: прокидываем `runtimeContext` из профиля (`mastra_users`) в агентские вызовы
    - `front/web/app/api/v1/agents/[agentId]/stream/route.ts`
    - `front/web/app/api/v1/agents/[agentId]/stream-vnext/route.ts`
    - `front/web/app/api/v1/agents/[agentId]/respond/route.ts`

