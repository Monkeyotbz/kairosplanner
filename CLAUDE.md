# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (Vite + React)
```bash
cd frontend
npm run dev      # localhost:5173
npm run build
npm run preview
```

### Backend (Express)
```bash
cd backend
npm run dev    # node --watch, localhost:3001
npm start
```

Both must run simultaneously for full functionality. The backend CORS is hardcoded to `http://localhost:5173`.

## Architecture

KAIROS is a personal productivity app (Spanish UI) with a **React SPA frontend** and a thin **Express backend**, both using Supabase as the database.

### Frontend structure (`frontend/src/`)

| Layer | Description |
|---|---|
| `pages/` | Route-level views. Each page has a paired `.module.css`. |
| `components/<module>/` | Feature components grouped by module: `kairos/`, `focus/`, `music/`, `chat/`, `kanban/`, `calendar/`, `finanzas/`, `stats/`, `timer/`, `entorno/`, `layout/`, `ui/` |
| `store/` | Zustand stores — one per domain. No middleware; localStorage persistence is done manually with helper functions inside each store. |
| `services/` | Direct Supabase calls + external API calls. No abstraction layer — services export plain async functions. |
| `hooks/` | Three custom hooks: `useFocusRecovery`, `useKairosVoice` (Web Speech API), `useSpeech` (TTS). |

### Routing & shell

`App.jsx` defines all routes. Authenticated routes are wrapped in `<ProtectedRoute>` and rendered inside `<AppShell>`, which mounts global overlays: `MusicPlayer`, `ChatPanel`, `ImmersiveFocus`, `FocusCapsule`, `AbadChat`, `AbadOnboarding`, `ToastContainer`, `StarField`.

`AppShell` also handles two global effects on mount:
- Loads subscription state via `useSubscriptionStore.load()` and redirects to `/upgrade` if not active.
- Runs `useFocusRecovery()` to close orphaned focus sessions after a crash or F5.

### State management

All global state is Zustand. Key stores:

- **`authStore`** — session + profile from `usuarios` table. Initialized once in `App.jsx`.
- **`subscriptionStore`** — trial/active/expired status. Determines app access gate.
- **`focusStore`** — focus timer state. Uses wall-clock anchor timing (`startedAtMs + elapsedOffset`) instead of tick counting, making it resilient to background tab throttling. Writes a `kairos-focus-checkpoint` to localStorage on every state change so `useFocusRecovery` can close the session after a crash.
- **`abadStore`** — ABAD AI chat history, persisted to `kairos-abad-chat` in localStorage (last 50 messages).
- **`musicStore`** — YouTube + Spotify playback state. YouTube playlists are persisted to `kairos-yt-playlists`.
- **`themeStore`** — Active theme (`nebula` | `studio` | `forest` | `ocean` | `snow`), applied via `data-theme` attribute on `<html>`.

### AI features

- **ABAD** (`components/kairos/AbadChat`, `AbadOnboarding`) — multi-turn AI assistant powered by `@anthropic-ai/sdk` (Claude). Uses `services/chatService.js` with conversation history.
- **useKairosVoice** — Web Speech API wrapper for voice input (continuous, Spanish).
- **useSpeech** — TTS for onboarding narration (Web Speech Synthesis).

### Subscriptions

`services/subscriptionService.js` checks `usuarios.subscription_status` in Supabase. Trial = 14 days from `user.created_at`. Payment flow uses MercadoPago (Colombia); the backend is expected to expose `/api/mp-subscribe` and `/api/mp-cancel` endpoints (not yet implemented in `backend/src/app.js`).

### Database

All SQL lives in `backend/database/`. Run files manually in **Supabase Dashboard > SQL Editor** in this order for a fresh setup:
1. `schema.sql` — core tables
2. `nuevas_tablas.sql` — focus sessions, calendar events, finance tables
3. `perfil_kairos.sql`, `subscripcion.sql`, `usuarios_publicos.sql` — extended profile & billing
4. `rls_policies.sql`, `rls_insert_policies.sql`, `columnas_delete_policy.sql`, `eventos_calendario_rls.sql` — Row Level Security
5. `security_fixes.sql` — latest security patches (pending execution)

### Environment variables

**`frontend/.env.local`**
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_SPOTIFY_CLIENT_ID
VITE_UNSPLASH_ACCESS_KEY
```

**`backend/.env`**
```
PORT=3001
SUPABASE_URL
SUPABASE_SERVICE_KEY
```

MercadoPago keys are not yet in `.env`; they will be `MP_ACCESS_TOKEN` and `MP_PLAN_ID`.
