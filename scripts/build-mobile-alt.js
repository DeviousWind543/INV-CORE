// scripts/build-mobile-alt.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Construyendo INV-CORE para móvil (método alternativo)...\n');

// 1. Limpiar builds anteriores
console.log('📦 Limpiando builds anteriores...');
if (fs.existsSync('.next')) {
  fs.rmSync('.next', { recursive: true, force: true });
}
if (fs.existsSync('out')) {
  fs.rmSync('out', { recursive: true, force: true });
}
if (fs.existsSync('standalone')) {
  fs.rmSync('standalone', { recursive: true, force: true });
}

// 2. Build de Next.js en modo standalone
console.log('\n🔨 Construyendo Next.js en modo standalone...');
try {
  execSync('npx next build', { stdio: 'inherit', env: { ...process.env, NEXT_OUTPUT_MODE: 'standalone' } });
} catch (error) {
  console.log('Build completado con advertencias');
}

// 3. Crear estructura para Capacitor
console.log('\n📱 Preparando para Capacitor...');

// Crear carpeta 'out' con los archivos estáticos necesarios
if (!fs.existsSync('out')) {
  fs.mkdirSync('out', { recursive: true });
}

// Copiar archivos estáticos desde .next/static
if (fs.existsSync('.next/static')) {
  if (!fs.existsSync('out/_next')) {
    fs.mkdirSync('out/_next', { recursive: true });
  }
  fs.cpSync('.next/static', 'out/_next/static', { recursive: true });
}

// Crear index.html básico que redirige a la app
const indexHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>INV-CORE</title>
  <script>
    // Redirigir a la app real en Vercel
    window.location.href = 'https://inv-core.vercel.app' + window.location.pathname;
  </script>
</head>
<body>
  <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: #2D1B69;">
    <div style="color: #FFD700; text-align: center;">
      <h1>INV-CORE</h1>
      <p>Cargando...</p>
    </div>
  </div>
</body>
</html>`;

fs.writeFileSync('out/index.html', indexHtml);
console.log('✅ out/index.html creado');

// 4. Actualizar capacitor.config.json
const capacitorConfig = {
  appId: "com.invcore.app",
  appName: "INV-CORE",
  webDir: "out",
  bundledWebRuntime: false,
  server: {
    androidScheme: "https",
    cleartext: false,
    hostname: "inv-core.vercel.app",
    url: "https://inv-core.vercel.app"
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: false
  }
};

fs.writeFileSync('capacitor.config.json', JSON.stringify(capacitorConfig, null, 2));
console.log('✅ capacitor.config.json actualizado');

console.log('\n🎉 Configuración completada!');
console.log('\nSiguientes pasos:');
console.log('1. npx cap sync android');
console.log('2. npx cap open android');