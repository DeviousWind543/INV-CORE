// components/CameraUpload.tsx
'use client';

import { useState, useEffect } from 'react';
import { Camera as CameraIcon, Upload, Loader2, AlertCircle } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

interface CameraUploadProps {
  onImageCaptured: (imageUrl: string, file: File) => void;
  disabled?: boolean;
  buttonText?: string;
}

export default function CameraUpload({ onImageCaptured, disabled = false, buttonText = "Tomar Foto" }: CameraUploadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPermissionError, setShowPermissionError] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionLoading, setPermissionLoading] = useState(true);
  const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();

  // Verificar permisos al cargar
  useEffect(() => {
    const checkPermissions = async () => {
      if (!isNative) {
        setHasPermission(true);
        setPermissionLoading(false);
        return;
      }

      try {
        const status = await Camera.checkPermissions();
        
        if (status.camera === 'granted') {
          setHasPermission(true);
        } else {
          // Solicitar permisos automáticamente
          const request = await Camera.requestPermissions();
          setHasPermission(request.camera === 'granted');
        }
      } catch (error) {
        console.error('Error checking camera permissions:', error);
        setHasPermission(false);
      } finally {
        setPermissionLoading(false);
      }
    };

    checkPermissions();
  }, [isNative]);

  const requestPermissions = async () => {
    setPermissionLoading(true);
    try {
      const request = await Camera.requestPermissions();
      setHasPermission(request.camera === 'granted');
      return request.camera === 'granted';
    } catch (error) {
      console.error('Error requesting permissions:', error);
      setHasPermission(false);
      return false;
    } finally {
      setPermissionLoading(false);
    }
  };

  const takePhoto = async () => {
    setIsLoading(true);
    setShowPermissionError(false);
    
    try {
      if (isNative) {
        // Verificar permisos antes de abrir la cámara
        let granted = hasPermission;
        if (!granted) {
          granted = await requestPermissions();
        }
        
        if (!granted) {
          setShowPermissionError(true);
          setIsLoading(false);
          return;
        }

        const photo = await Camera.getPhoto({
          quality: 90,
          allowEditing: true,
          resultType: CameraResultType.Uri,  // ← CORREGIDO: usar el enum
          source: CameraSource.Camera,        // ← CORREGIDO: usar el enum
          saveToGallery: false,
        });

        // Obtener el archivo desde la URI
        const response = await fetch(photo.webPath!);
        const blob = await response.blob();
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const imageUrl = photo.webPath!;
        
        onImageCaptured(imageUrl, file);
      } else {
        // En web, usar input de archivo con captura de cámara
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const imageUrl = URL.createObjectURL(file);
            onImageCaptured(imageUrl, file);
          }
        };
        input.click();
      }
    } catch (error: any) {
      console.error('Error al tomar foto:', error);
      if (error.message?.includes('cancel')) {
        // Usuario canceló, no mostrar error
      } else if (error.message?.includes('permission')) {
        setShowPermissionError(true);
      } else {
        alert('No se pudo acceder a la cámara. Verifica los permisos.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const selectFromGallery = async () => {
    setIsLoading(true);
    setShowPermissionError(false);
    
    try {
      if (isNative) {
        const photo = await Camera.getPhoto({
          quality: 90,
          allowEditing: true,
          resultType: CameraResultType.Uri,  // ← CORREGIDO: usar el enum
          source: CameraSource.Photos,        // ← CORREGIDO: usar el enum
        });

        const response = await fetch(photo.webPath!);
        const blob = await response.blob();
        const file = new File([blob], `gallery_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const imageUrl = photo.webPath!;
        
        onImageCaptured(imageUrl, file);
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const imageUrl = URL.createObjectURL(file);
            onImageCaptured(imageUrl, file);
          }
        };
        input.click();
      }
    } catch (error: any) {
      console.error('Error al seleccionar imagen:', error);
      if (!error.message?.includes('cancel')) {
        alert('Error al seleccionar imagen');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Si está verificando permisos, mostrar loader
  if (isNative && permissionLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 size={24} className="animate-spin text-[#2D1B69]" />
        <span className="ml-2 text-xs text-slate-500">Verificando permisos...</span>
      </div>
    );
  }

  // Si no tiene permisos, mostrar mensaje y botón para solicitar
  if (isNative && hasPermission === false) {
    return (
      <div className="flex flex-col items-center gap-3 p-4">
        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
          <AlertCircle size={16} />
          <span className="text-xs">Se necesitan permisos de cámara</span>
        </div>
        <button
          type="button"
          onClick={requestPermissions}
          className="bg-[#2D1B69] text-white px-4 py-2 rounded-lg text-xs font-bold"
        >
          Solicitar Permisos
        </button>
      </div>
    );
  }

  if (!isNative) {
    // En web, usar input de archivo normal
    return (
      <div className="flex items-center gap-2">
        <label className="cursor-pointer bg-[#2D1B69] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2">
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          Subir Imagen
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                setIsLoading(true);
                const imageUrl = URL.createObjectURL(file);
                onImageCaptured(imageUrl, file);
                setIsLoading(false);
              }
            }}
            disabled={disabled || isLoading}
          />
        </label>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      {showPermissionError && (
        <div className="bg-red-50 text-red-600 p-2 rounded-lg text-xs text-center">
          No se pudo acceder a la cámara. Por favor, concede los permisos desde la configuración de la app.
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={takePhoto}
          disabled={disabled || isLoading}
          className="flex-1 bg-[#2D1B69] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2"
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <CameraIcon size={14} />}
          {buttonText}
        </button>
        <button
          type="button"
          onClick={selectFromGallery}
          disabled={disabled || isLoading}
          className="flex-1 bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2"
        >
          <Upload size={14} />
          Galería
        </button>
      </div>
    </div>
  );
}