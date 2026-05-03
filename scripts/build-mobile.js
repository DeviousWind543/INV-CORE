// scripts/build-mobile.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Construyendo INV-CORE para móvil...\n');

// 1. Limpiar builds anteriores
console.log('📦 Limpiando builds anteriores...');
try {
  if (fs.existsSync('.next')) {
    fs.rmSync('.next', { recursive: true, force: true });
  }
  if (fs.existsSync('out')) {
    fs.rmSync('out', { recursive: true, force: true });
  }
} catch (e) {
  console.log('No se pudo limpiar completamente, continuando...');
}

// 2. Build de Next.js
console.log('\n🔨 Construyendo Next.js...');
try {
  execSync('npx next build', { stdio: 'inherit' });
} catch (error) {
  console.log('⚠️  Build completado con advertencias, continuando...');
}

// 3. Verificar si existe la carpeta out
if (fs.existsSync('out')) {
  console.log('\n✅ Build exitoso! Carpeta "out" creada.');
  
  // 4. Crear archivo de configuración para Capacitor
  const capacitorConfig = {
    appId: "com.invcore.app",
    appName: "INV-CORE",
    webDir: "out",
    bundledWebRuntime: false,
    server: {
      androidScheme: "https",
      cleartext: true
    },
    android: {
      allowMixedContent: true,
      webContentsDebuggingEnabled: false
    }
  };
  
  fs.writeFileSync('capacitor.config.json', JSON.stringify(capacitorConfig, null, 2));
  console.log('\n✅ capacitor.config.json actualizado');
  
  // 5. Sincronizar con Capacitor
  console.log('\n🔄 Sincronizando con Capacitor...');
  try {
    execSync('npx cap sync android', { stdio: 'inherit' });
    console.log('\n✅ Sincronización completa!');
  } catch (e) {
    console.log('⚠️  Error en sync, asegúrate de tener Android configurado');
  }
  
} else {
  console.error('\n❌ Error: No se encontró la carpeta "out"');
  process.exit(1);
}

console.log('\n🎉 Listo para abrir en Android Studio!');
console.log('Ejecuta: npx cap open android');