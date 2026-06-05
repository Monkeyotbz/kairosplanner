# Implementación del Asistente de Voz KAIROS (J.A.R.V.I.S. Integrado)

Este documento detalla la arquitectura, el esquema y el plan por fases para la integración del "Cerebro de KAIROS", un asistente de voz que permite al usuario gestionar su Kanban, Calendario, Sesiones de Enfoque y Finanzas mediante lenguaje natural.

## 1. Arquitectura del Sistema
El flujo estructurado del asistente es el siguiente:
1. **Frontend (Voz a Texto):** Asistente flotante global con animación estilo "Siri". Utiliza la `Web Speech API` en modo continuo (`useKairosVoice`) para capturar comandos largos sin cortes.
2. **Backend (Edge Function):** Función `kairos-brain` alojada en Supabase (Deno/TypeScript) que recibe la transcripción.
3. **Procesamiento (LLM):** La Edge Function inyecta contexto (fecha/hora), llama a la API de OpenAI/Gemini con un "System Prompt" estricto y retorna un JSON multi-intención.
4. **Ejecución (Supabase DB):** La Edge Function parsea el JSON y ejecuta las inserciones correspondientes respetando el RLS.
5. **Frontend (Texto a Voz):** El frontend recibe el resultado, actualiza la UI y usa `window.speechSynthesis` para confirmar la acción mediante voz.

## 2. Esquema de Datos Relevante (Supabase)
Las tablas principales sobre las que actúa el sistema:
- `tarjetas`: id, columna_id, asignado_a, titulo, prioridad, fecha_limite.
- `transacciones`: id, usuario_id, concepto, monto, tipo, categoria_id, fecha.
- `eventos_calendario`: id, proyecto_id, titulo, fecha_inicio, fecha_fin.
- `sesiones_enfoque`: id, usuario_id, tipo, duracion_plan_min, inicio, estado.

## 3. System Prompt de la IA (Reglas de Extracción)
- **Identidad:** KAIROS, asistente hiper-eficiente.
- **Regla Estricta:** NUNCA devolver markdown, SOLO un JSON válido.
- **Estructura Esperada:**
  ```json
  {
    "respuesta_voz": "Frase corta de confirmación...",
    "acciones": [
      { "tipo": "crear_tarea", "parametros": { ... } },
      { "tipo": "registrar_transaccion", "parametros": { ... } },
      { "tipo": "agendar_evento", "parametros": { ... } }
    ]
  }
  ```

## 4. Plan de Ejecución por Fases

- [x] **Fase 1: Frontend (Interfaz de Voz).**
  - Creación del hook `useKairosVoice` con soporte de escucha continua y buffer manual.
  - Implementación del `KairosAssistant`, un componente flotante estilo Siri con animaciones de gradientes mágicos.
  - Inyección del asistente en el layout global (`AppShell.jsx`).
  - *Estado: COMPLETADO.*

- [ ] **Fase 2: Backend (Edge Function Base).**
  - Crear el esqueleto de la Supabase Edge Function `kairos-brain` con Deno.
  - Validar CORS y autenticación de usuario.

- [ ] **Fase 3: Procesamiento LLM.**
  - Implementar la llamada a la IA (OpenAI/Gemini) dentro de la Edge Function.
  - Inyectar el System Prompt y parsear el JSON estructurado de salida.

- [ ] **Fase 4: Motor de Ejecución.**
  - Implementar el switch-case en la Edge Function para hacer los `inserts` en la base de datos según el JSON de la IA.

- [ ] **Fase 5: Text-to-Speech (TTS).**
  - Implementar el `window.speechSynthesis` en el frontend cuando la API responda.

- [ ] **Fase 6: Vista Calendario.**
  - Crear la vista visual del Calendario Mensual en React para reflejar los resultados visualmente.
