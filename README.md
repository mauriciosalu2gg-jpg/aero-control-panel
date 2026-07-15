# Aero Panels — Panel de Control

Interfaz web de control y administración para el bot de Discord de Aero. Conectada mediante Netlify Functions a una base de datos segura en Google Cloud Firestore.

## Requisitos Previos

- [Node.js](https://nodejs.org/) v18 o superior
- [Netlify CLI](https://docs.netlify.com/cli/get-started/) instalado de forma global (`npm install -g netlify-cli`)

## Instalación y Configuración Local

1. Instala las dependencias del proyecto:
   ```bash
   npm install
   ```

2. Crea tu archivo `.env` para la configuración local basándote en el ejemplo:
   ```bash
   cp .env.example .env
   ```

3. Obtén las llaves de tu cuenta de servicio de Firebase:
   - Dirígete a la consola de Firebase -> Configuración del Proyecto -> Cuentas de Servicio.
   - Presiona **Generar nueva clave privada**.
   - Descarga el archivo JSON, renombralo a `firebase-service-account.json` y colócalo dentro de la carpeta `config/`. (Este archivo está ignorado por Git por motivos de seguridad).

4. Levanta el servidor de desarrollo local con Netlify:
   ```bash
   netlify dev
   ```

El servidor web y las Serverless Functions estarán disponibles de forma local en `http://localhost:8888`.
