# Hallacas en Familia 2026

Aplicación web colaborativa en tiempo real para organizar pedidos de hallacas y bollos por grupo familiar, calcular ingredientes escalados con merma, gestionar compras en $ y Bs (con tasa congelada), llevar otras compras aparte y liquidar cuentas estilo Splitwise.

## Clave de acceso familiar
`familia` (no distingue mayúsculas ni espacios).

## Pasos para desplegar (5 minutos)

### 1. Configurar Firebase (Gratis)
1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/).
2. Agrega una **App Web (`</>`)** y copia las credenciales.
3. En **Authentication → Método de inicio de sesión**, activa **Anónimo (Anonymous)**.
4. En **Firestore Database**, crea la base de datos en modo producción.
5. En **Firestore → Reglas**, pega el contenido del archivo `firestore.rules` de este proyecto y haz clic en **Publicar**.

### 2. Probar en local (opcional)
```bash
npm install
cp .env.example .env
# Rellena tus credenciales de Firebase en .env
npm run dev
```

### 3. Desplegar en Vercel
1. Sube esta carpeta a un repositorio en GitHub.
2. En [Vercel](https://vercel.com/), importa el repositorio.
3. En **Environment Variables**, pega las 7 variables de `.env.example` con tus valores de Firebase.
4. Haz clic en **Deploy**.
5. **Importante:** Copia el dominio generado por Vercel (ej. `tu-app.vercel.app`) y agrégalo en **Firebase Console → Authentication → Configuración → Dominios autorizados**.
