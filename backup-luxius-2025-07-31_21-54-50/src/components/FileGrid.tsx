import React from 'react';
import { FileUp, Package, Check, X } from 'lucide-react';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: "uploading" | "completed" | "error";
  preview?: string;
  metadata?: {
    colorSpace?: "RGB" | "CMYK" | "Grayscale" | "Unknown";
    resolution?: number;
    dimensions?: {
      width: number;
      height: number;
    };
    pages?: number;
  };
  material?: string;
  alto?: string;
  ancho?: string;
  copias?: number;
}

interface FileGridProps {
  files: UploadedFile[];
  selectedFiles: string[];
  onFileSelect: (fileId: string, selected: boolean) => void;
  onFileRemove: (fileId: string) => void;
  onFilePreview: (file: UploadedFile) => void;
  maxFiles?: number;
}

export default function FileGrid({
  files,
  selectedFiles,
  onFileSelect,
  onFileRemove,
  onFilePreview,
  maxFiles = 25
}: FileGridProps) {
  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('image')) return '🖼️';
    if (type.includes('photoshop') || type.includes('psd')) return '🎨';
    if (type.includes('illustrator') || type.includes('ai')) return '✏️';
    if (type.includes('eps')) return '📋';
    return '📁';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFilePhysicalDimensions = (file: UploadedFile) => {
    if (!file.metadata?.dimensions || !file.metadata?.resolution) return null;
    
    const dpi = file.metadata.resolution;
    const widthPx = file.metadata.dimensions.width;
    const heightPx = file.metadata.dimensions.height;
    
    // Convertir píxeles a centímetros usando DPI
    const widthCm = (widthPx / dpi) * 2.54;
    const heightCm = (heightPx / dpi) * 2.54;
    
    return { width: widthCm, height: heightCm };
  };

  const getResolutionQuality = (dpi: number) => {
    if (dpi < 72) return { level: "Baja", color: "bg-red-100 text-red-800" };
    if (dpi < 150) return { level: "Media", color: "bg-yellow-100 text-yellow-800" };
    return { level: "Alta", color: "bg-green-100 text-green-800" };
  };

  return (
    <div className="space-y-4">
             {/* Header con contador y checkbox "Seleccionar todos" */}
       <div className="flex items-center justify-between">
         <div className="flex items-center space-x-4">
           <div className="flex items-center space-x-2">
             <Package className="w-5 h-5 text-blue-600" />
             <span className="text-sm font-medium text-gray-700">
               Archivos cargados ({files.length}/{maxFiles})
             </span>
           </div>
           
           {/* Checkbox "Seleccionar todos" */}
           {files.length > 0 && (
             <div className="flex items-center space-x-2">
               <button
                 onClick={() => {
                   if (selectedFiles.length === files.length) {
                     // Si todos están seleccionados, deseleccionar todos
                     onFileSelect('all', false);
                   } else {
                     // Si no todos están seleccionados, seleccionar todos
                     onFileSelect('all', true);
                   }
                 }}
                 className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                   selectedFiles.length === files.length && files.length > 0
                     ? 'bg-blue-500 border-blue-500 text-white'
                     : 'bg-white border-gray-300 hover:border-blue-400'
                 }`}
                 title={selectedFiles.length === files.length ? "Deseleccionar todos" : "Seleccionar todos"}
               >
                 {selectedFiles.length === files.length && files.length > 0 && <Check className="w-4 h-4" />}
               </button>
               <span className="text-sm text-gray-600 font-medium">
                 {selectedFiles.length === files.length && files.length > 0 ? "Deseleccionar todos" : "Seleccionar todos"}
               </span>
             </div>
           )}
         </div>
         
         <div className="text-sm text-gray-500">
           Seleccionados: {selectedFiles.length}
         </div>
       </div>

       {/* Instrucciones */}
       {files.length > 0 && (
         <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
           <div className="flex items-center space-x-2">
             <Check className="w-4 h-4 text-blue-600" />
             <span className="text-sm text-blue-800 font-medium">
               Haz clic en el checkbox cuadrado para seleccionar los archivos que quieres incluir en el pedido
             </span>
           </div>
         </div>
       )}

             {/* Grilla de archivos */}
       <div className="space-y-3">
        {files.map((file) => {
          const isSelected = selectedFiles.includes(file.id);
          const physicalDimensions = getFilePhysicalDimensions(file);
          const quality = file.metadata?.resolution ? getResolutionQuality(file.metadata.resolution) : null;

          return (
                         <div
               key={file.id}
               className={`relative bg-white rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
                 isSelected 
                   ? 'border-blue-500 bg-blue-50' 
                   : 'border-gray-200 hover:border-gray-300'
               }`}
             >
                               {/* Layout horizontal optimizado para una columna */}
                <div className="flex items-center p-4 space-x-4">
                  {/* Checkbox de selección - Más grande y claro */}
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => onFileSelect(file.id, !isSelected)}
                      className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'bg-white border-gray-300 hover:border-blue-400'
                      }`}
                      title={isSelected ? "Deseleccionar archivo" : "Seleccionar archivo"}
                    >
                      {isSelected && <Check className="w-6 h-6" />}
                    </button>
                  </div>

                  {/* Thumbnail */}
                  <div 
                    className="flex-shrink-0 cursor-pointer"
                    onClick={() => onFilePreview(file)}
                  >
                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                      {file.preview ? (
                        <img
                          src={file.preview}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-3xl">
                          {getFileIcon(file.type)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Información del archivo */}
                  <div className="flex-1 min-w-0">
                    <div className="space-y-2">
                      {/* Nombre del archivo */}
                      <div className="text-base font-medium text-gray-900 truncate" title={file.name}>
                        {file.name}
                      </div>

                      {/* Tamaño */}
                      <div className="text-sm text-gray-500">
                        {formatFileSize(file.size)}
                      </div>

                      {/* Dimensiones físicas */}
                      {physicalDimensions && (
                        <div className="text-sm text-gray-600">
                          {physicalDimensions.width.toFixed(1)} × {physicalDimensions.height.toFixed(1)} cm
                        </div>
                      )}

                      {/* Calidad de resolución */}
                      {quality && (
                        <div className={`text-sm px-2 py-1 rounded-full ${quality.color}`}>
                          {file.metadata?.resolution} DPI - {quality.level} calidad
                        </div>
                      )}

                      {/* Color space */}
                      {file.metadata?.colorSpace && (
                        <div className="text-sm text-gray-500">
                          {file.metadata.colorSpace}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex-shrink-0 flex items-center space-x-3">
                    {/* Botón de preview */}
                    <button
                      onClick={() => onFilePreview(file)}
                      className="p-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Ver preview"
                    >
                      <FileUp className="w-5 h-5" />
                    </button>

                    {/* Botón de eliminar */}
                    <button
                      onClick={() => onFileRemove(file.id)}
                      className="p-3 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar archivo"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
             </div>
          );
        })}
      </div>

      {/* Mensaje cuando no hay archivos */}
      {files.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>No hay archivos cargados</p>
          <p className="text-sm">Arrastra archivos aquí o haz clic para seleccionar</p>
        </div>
      )}

      {/* Mensaje de límite alcanzado */}
      {files.length >= maxFiles && (
        <div className="text-center py-4 text-orange-600 bg-orange-50 rounded-lg">
          <p className="text-sm font-medium">
            Límite de {maxFiles} archivos alcanzado
          </p>
        </div>
      )}
    </div>
  );
} 