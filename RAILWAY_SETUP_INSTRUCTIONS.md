# 🚀 INSTRUCCIONES PARA CONFIGURAR RAILWAY

## ⚠️ CONFIGURACIÓN MANUAL REQUERIDA EN RAILWAY DASHBOARD

### 1. 🎯 **Root Directory** (OBLIGATORIO PARA MONOREPOS)
```
En Railway Dashboard → Settings → Build:
- Root Directory: realtime-openai-ax
```

### 2. 🔧 **Build Settings** (AUTOMÁTICO)
```
Builder: Dockerfile (detectado automáticamente)
Build Command: (dejar vacío)
Start Command: (dejar vacío)
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

### Paso 1: Configurar Root Directory (CRÍTICO)
1. Ve a Railway Dashboard → Settings → Build
2. En **Root Directory**, ingresa: `realtime-openai-ax`
3. Click **Save/Update**
4. Esto hace que Railway ejecute todo desde el subdirectorio

### Paso 2: Verificar Configuración Automática
1. **Builder** debería detectarse como "Dockerfile" automáticamente
2. **NO** agregues Dockerfile Path (Railway lo encuentra automáticamente)
3. **NO** agregues comandos de build o start personalizados

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
