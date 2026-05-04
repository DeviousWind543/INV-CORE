// components/CameraUpload.tsx
'use client';

import { useState } from 'react';
import { Camera as CameraIcon, Upload, Loader2, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

interface CameraUploadProps {
  onImageCaptured: (imageUrl: string, file: File) => void;
  disabled?: boolean;
  buttonText?: string;
}

export default function CameraUpload({ onImageCaptured, disabled = false, buttonText = "Tomar Foto" }: CameraUploadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();

  const takePhoto = async () => {
    setIsLoading(true);
    try {
      if (isNative) {
        // Importar dinámicamente el plugin de cámara
        const { Camera } = await import('@capacitor/camera');
        
        const photo = await Camera.getPhoto({
          quality: 90,
          allowEditing: true,
          resultType: 0, // CameraResultType.Uri
          source: 1, // CameraSource.Camera
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
      } else {
        alert('No se pudo acceder a la cámara. Verifica los permisos.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const selectFromGallery = async () => {
    setIsLoading(true);
    try {
      if (isNative) {
        const { Camera } = await import('@capacitor/camera');
        
        const photo = await Camera.getPhoto({
          quality: 90,
          allowEditing: true,
          resultType: 0, // CameraResultType.Uri
          source: 2, // CameraSource.Photos
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