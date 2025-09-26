# 🚀 CONFIGURACIÓN RAILWAY MONOREPO - SOLUCIÓN DEFINITIVA

## 📋 PROBLEMA IDENTIFICADO
Railway está ejecutando desde el root del repositorio, pero necesita ejecutar desde `realtime-openai-ax/`

## ✅ SOLUCIÓN SEGÚN DOCUMENTACIÓN RAILWAY

### 1. 🎯 **CONFIGURAR ROOT DIRECTORY** (OBLIGATORIO)

En Railway Dashboard:
```
Settings → Build → Root Directory
Valor: realtime-openai-ax
```

### 2. 🔧 **CONFIGURACIÓN AUTOMÁTICA**
- Railway detectará automáticamente el `Dockerfile` en `realtime-openai-ax/`
- No necesitas especificar `dockerfilePath`
- Railway ejecutará todo desde el subdirectorio

### 3. 📊 **ARCHIVOS NECESARIOS**

#### `/railway.json` (root del repo)
```json
{
  "$schema": "https://railway.app/railway.schema.json"
}
```

#### `/realtime-openai-ax/Dockerfile`
```dockerfile
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production

FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

## 🎯 PASOS PARA CONFIGURAR

### Paso 1: Configurar Root Directory
1. Ve a Railway Dashboard
2. Settings → Build
3. **Root Directory:** `realtime-openai-ax`
4. Save

### Paso 2: Verificar Configuración
- Builder: Dockerfile (automático)
- Build Command: (vacío)
- Start Command: (vacío)

### Paso 3: Deploy
- Push cambios al repositorio
- Railway ejecutará desde `realtime-openai-ax/`
- Encontrará `package.json` correctamente

## 📊 ESTRUCTURA ESPERADA

```
/
├── railway.json              # Configuración mínima
├── realtime-openai-ax/       # ← ROOT DIRECTORY
│   ├── Dockerfile           # ← Railway usa este
│   ├── package.json         # ← Railway encuentra este
│   ├── src/
│   └── ...
└── recursos/                # Ignorado por Railway
```

## 🚨 IMPORTANTE

1. **Root Directory es OBLIGATORIO** para monorepos
2. **NO uses dockerfilePath** - Railway lo detecta automáticamente
3. **NO uses comandos cd** - Railway ya está en el directorio correcto
4. **Dockerfile debe estar en el subdirectorio** `realtime-openai-ax/`

## ✅ RESULTADO ESPERADO

Con Root Directory configurado:
```
Railway ejecuta desde: /app/realtime-openai-ax/
COPY package.json → Encuentra: /app/realtime-openai-ax/package.json ✅
COPY . . → Copia desde: /app/realtime-openai-ax/ ✅
```

Sin Root Directory (ERROR actual):
```
Railway ejecuta desde: /app/
COPY package.json → Busca: /app/package.json ❌ (no existe)
```
