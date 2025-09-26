# 🚀 INSTRUCCIONES PARA CONFIGURAR RAILWAY

## ⚠️ CONFIGURACIÓN MANUAL REQUERIDA EN RAILWAY DASHBOARD

### 1. 🎯 **Build Settings** (CONFIGURACIÓN ACTUALIZADA)
```
Builder: Dockerfile (automático)
Dockerfile Path: realtime-openai-ax/Dockerfile
Build Command: (dejar vacío)
Watch Paths: realtime-openai-ax/**
```

### 2. 🔧 **Root Directory** (OPCIONAL)
```
En Railway Dashboard → Settings → Build:
- Root Directory: (dejar vacío - no necesario con esta configuración)
```

### 3. 🚀 **Deploy Settings**
```
Start Command: (dejar vacío - usará CMD del Dockerfile)
Healthcheck Path: /
Healthcheck Timeout: 100
```

### 4. 🌐 **Variables de Entorno** (Opcional)
```
NODE_ENV=production
PORT=3000
```

## 📋 PASOS DETALLADOS

### Paso 1: Verificar Builder
1. En **Build Settings**, asegúrate que esté seleccionado **"Dockerfile"**
2. Dockerfile Path debería mostrar: `realtime-openai-ax/Dockerfile`
3. **NO** agregues comandos de build personalizados
4. **NO** agregues start commands personalizados

### Paso 2: Configurar Watch Paths (Opcional)
1. En **Watch Paths**, agrega: `realtime-openai-ax/**`
2. Esto asegura que solo cambios en el subdirectorio activen builds

### Paso 3: Deploy
1. Haz push de los cambios a tu repositorio
2. Railway detectará automáticamente el Dockerfile
3. Usará `realtime-openai-ax/` como directorio raíz
4. Ejecutará el build desde ese directorio

## ✅ RESULTADO ESPERADO

Con esta configuración:
- ✅ Railway usará `realtime-openai-ax/` como directorio raíz
- ✅ No ejecutará comandos `cd` problemáticos
- ✅ El Dockerfile copiará archivos correctamente
- ✅ La aplicación se iniciará con `node server.js`

## 🚨 IMPORTANTE

**NO uses comandos `cd` en Railway**. En su lugar:
1. Configura **Root Directory** en el dashboard
2. Deja que el Dockerfile maneje la estructura de archivos
3. Railway ejecutará todo desde el directorio correcto automáticamente

## 📊 VERIFICACIÓN

Después de configurar el Root Directory, el build debería mostrar:
```
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build
```

Sin errores de `cd` porque Railway ya está trabajando desde `realtime-openai-ax/`.
