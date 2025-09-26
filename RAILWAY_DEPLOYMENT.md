# 🚀 Deployment en Railway - Realtime-OpenAI-AX

**Configuración para usar el subdirectorio `realtime-openai-ax/` como raíz del proyecto**

## 📋 ARCHIVOS DE CONFIGURACIÓN CREADOS

### 1. `railway.json` - Configuración Principal
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd realtime-openai-ax && npm ci && npm run build",
    "watchPatterns": ["realtime-openai-ax/**"]
  },
  "deploy": {
    "startCommand": "cd realtime-openai-ax && npm start",
    "healthcheckPath": "/",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### 2. `nixpacks.toml` - Configuración de Build
- Especifica Node.js 20
- Comandos de instalación y build desde subdirectorio
- Variables de entorno para producción

### 3. `Dockerfile` - Contenedor Docker
- Multi-stage build optimizado
- Copia archivos desde `realtime-openai-ax/`
- Configuración standalone de Next.js

## 🎯 CONFIGURACIÓN DE NEXT.JS ACTUALIZADA

El archivo `next.config.ts` ha sido actualizado con:
- `output: 'standalone'` para Railway
- Optimizaciones de producción
- Configuración de imágenes
- Variables de entorno

## 🚀 PASOS PARA DEPLOYMENT

### 1. Conectar Repositorio a Railway
```bash
# En Railway Dashboard
1. New Project → Deploy from GitHub repo
2. Seleccionar tu repositorio
3. Railway detectará automáticamente la configuración
```

### 2. Variables de Entorno (Opcional)
```bash
# En Railway Dashboard → Variables
NODE_ENV=production
PORT=3000
# Agregar otras variables según necesites
```

### 3. Deploy Automático
- Railway usará `railway.json` automáticamente
- Build se ejecutará desde `realtime-openai-ax/`
- La aplicación se iniciará con `npm start`

## 📊 ESTRUCTURA DE ARCHIVOS PARA RAILWAY

```
/
├── railway.json          # ✅ Configuración principal
├── nixpacks.toml         # ✅ Build configuration
├── Dockerfile            # ✅ Docker alternativo
├── RAILWAY_DEPLOYMENT.md # ✅ Esta documentación
└── realtime-openai-ax/   # 🎯 DIRECTORIO RAÍZ DE LA APP
    ├── package.json      # ✅ Dependencias
    ├── next.config.ts    # ✅ Configurado para Railway
    ├── src/              # ✅ Código fuente
    └── ...               # ✅ Resto de archivos Next.js
```

## 🔧 COMANDOS UTILIZADOS POR RAILWAY

```bash
# Build
cd realtime-openai-ax && npm ci && npm run build

# Start
cd realtime-openai-ax && npm start

# Health Check
GET / (respuesta 200 OK)
```

## 🎯 VENTAJAS DE ESTA CONFIGURACIÓN

- ✅ **No mueve archivos** - Mantiene estructura original
- ✅ **Build optimizado** - Solo procesa el subdirectorio necesario
- ✅ **Standalone output** - Aplicación autocontenida
- ✅ **Health checks** - Monitoreo automático
- ✅ **Restart policy** - Recuperación automática ante fallos
- ✅ **Watch patterns** - Solo observa cambios relevantes

## 🚨 NOTAS IMPORTANTES

1. **Estructura mantenida**: Los archivos permanecen en `realtime-openai-ax/`
2. **Build context**: Railway ejecuta comandos desde el subdirectorio
3. **Variables de entorno**: Se pueden configurar en Railway Dashboard
4. **Logs**: Disponibles en Railway Dashboard para debugging

## 🎉 RESULTADO

Railway desplegará tu aplicación Next.js usando `realtime-openai-ax/` como directorio raíz, manteniendo toda tu estructura de archivos intacta.

**URL de la aplicación**: `https://tu-proyecto.up.railway.app`
