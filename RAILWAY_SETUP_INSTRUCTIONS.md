# 🚀 INSTRUCCIONES PARA CONFIGURAR RAILWAY

## ⚠️ CONFIGURACIÓN MANUAL REQUERIDA EN RAILWAY DASHBOARD

### 1. 🎯 **Root Directory** (MUY IMPORTANTE)
```
En Railway Dashboard → Settings → Build:
- Add Root Directory: realtime-openai-ax
```

### 2. 🔧 **Build Settings**
```
Builder: Dockerfile (automático)
Build Command: (dejar vacío)
Watch Paths: (dejar vacío o automático)
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

### Paso 1: Configurar Root Directory
1. Ve a tu proyecto en Railway Dashboard
2. Click en **Settings**
3. En la sección **Build**, busca **"Add Root Directory"**
4. Ingresa: `realtime-openai-ax`
5. Click **Update**

### Paso 2: Verificar Builder
1. En **Build Settings**, asegúrate que esté seleccionado **"Dockerfile"**
2. **NO** agregues comandos de build personalizados
3. **NO** agregues start commands personalizados

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
