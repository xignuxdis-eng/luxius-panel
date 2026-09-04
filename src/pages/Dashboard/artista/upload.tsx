import { useState, useCallback } from "react";
import { Upload, X, FileText, Image, File, Eye, Package, FileUp, Grid, List, Send, Clock, CheckCircle, Info } from "lucide-react";
import SimpleMaterialSelector from "../../../components/SimpleMaterialSelector";
import FileGrid from "../../../components/FileGrid";
import ClientSelector from "../../../components/ClientSelector";
import { getMaterialById } from "../../../utils/materialHelpers";
import { getClientById } from "../../../data/clients";

interface FileMetadata {
  colorSpace?: "RGB" | "CMYK" | "Grayscale" | "Unknown";
  resolution?: number; // DPI
  dimensions?: {
    width: number;
    height: number;
  };
  pages?: number; // Para PDFs
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: "uploading" | "completed" | "error";
  preview?: string;
  metadata?: FileMetadata;
  // Campos específicos para archivos individuales
  material?: string;
  alto?: string;
  ancho?: string;
  copias?: number;
}

interface PendingOrder {
  id: string;
  timestamp: Date;
  files: UploadedFile[];
  info: {
    titulo: string;
    descripcion: string;
    clienteId: string; // Campo para identificar el cliente
    material: string;
    alto?: string;
    ancho?: string;
    copias: number;
    demasiaArribaAbajo: boolean;
    demasiaLaterales: boolean;
    demasiaCuatroLados: boolean;
    soldaduraPortabanner: boolean;
    rollbanner: boolean;
    estructuraPortabanner: boolean;
    estructuraRollbanner: boolean;
    laminado: boolean;
    instalacionRotuladoTensadoHerreria: boolean;
    enlacesExternos: ExternalLink[];
  };
  mode: "individual" | "lote";
}

type UploadMode = "individual" | "lote";

interface ExternalLink {
  id: string;
  url: string;
  isCompressed: boolean;
  addedAt: Date;
}

export default function UploadPage() {
  const [uploadMode, setUploadMode] = useState<UploadMode>("individual");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]); // Para modo lotes
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [externalLinkInput, setExternalLinkInput] = useState("");
  
  // Estado para archivos individuales
  const [individualInfo, setIndividualInfo] = useState({
    titulo: "",
    descripcion: "",
    clienteId: "", // Campo para seleccionar cliente
    material: "",
    alto: "",
    ancho: "",
    copias: 1,
    demasiaArribaAbajo: false,
    demasiaLaterales: false,
    demasiaCuatroLados: false,
    soldaduraPortabanner: false,
    rollbanner: false,
    estructuraPortabanner: false,
    estructuraRollbanner: false,
    laminado: false,
    instalacionRotuladoTensadoHerreria: false,
    enlacesExternos: [] as ExternalLink[] // Array de enlaces externos
  });

  // Estado para lotes
  const [loteInfo, setLoteInfo] = useState({
    titulo: "",
    descripcion: "",
    clienteId: "", // Campo para seleccionar cliente
    material: "",
    copias: 1,
    demasiaArribaAbajo: false,
    demasiaLaterales: false,
    demasiaCuatroLados: false,
    soldaduraPortabanner: false,
    rollbanner: false,
    estructuraPortabanner: false,
    estructuraRollbanner: false,
    laminado: false,
    instalacionRotuladoTensadoHerreria: false,
    enlacesExternos: [] as ExternalLink[] // Array de enlaces externos
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    
    // Validar límites según el modo
    if (uploadMode === "individual" && files.length > 1) {
      alert("En modo individual solo puedes subir un archivo a la vez");
      return;
    }
    
    if (uploadMode === "lote" && uploadedFiles.length + files.length > 25) {
      alert("En modo lotes puedes cargar hasta 25 archivos máximo");
      return;
    }
    
    await handleFiles(files);
  }, [uploadMode]);

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("handleFileSelect llamado");
    console.log("Evento:", e);
    console.log("Target:", e.target);
    console.log("Files:", e.target.files);
    
    const files = Array.from(e.target.files || []);
    console.log("Archivos seleccionados:", files);
    
    // Validar límites según el modo
    if (uploadMode === "individual" && files.length > 1) {
      alert("En modo individual solo puedes subir un archivo a la vez");
      e.target.value = ''; // Limpiar el input
      return;
    }
    
    if (uploadMode === "lote" && uploadedFiles.length + files.length > 25) {
      alert("En modo lotes puedes cargar hasta 25 archivos máximo");
      e.target.value = ''; // Limpiar el input
      return;
    }
    
    console.log("Llamando a handleFiles con", files.length, "archivos");
    await handleFiles(files);
    console.log("handleFiles completado");
  };

  const handleFiles = async (files: File[]) => {
    // En modo individual, reemplazar archivos existentes
    if (uploadMode === "individual") {
      uploadedFiles.forEach(file => {
        if (file.preview) URL.revokeObjectURL(file.preview);
      });
      setUploadedFiles([]);
    }

    const initialFiles: UploadedFile[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      progress: 0,
      status: "uploading" as const
    }));

    setUploadedFiles(prev => uploadMode === "individual" ? initialFiles : [...prev, ...initialFiles]);

    // Procesar cada archivo asincrónicamente
    initialFiles.forEach(async (initialFile, index) => {
      const originalFile = files[index];
      
      // Simular progreso
      const interval = setInterval(() => {
        setUploadedFiles(prev => {
          const currentFile = prev.find(f => f.id === initialFile.id);
          if (!currentFile) {
            clearInterval(interval);
            return prev;
          }
          if (currentFile.progress >= 100) {
            clearInterval(interval);
            return prev.map(f => f.id === initialFile.id ? { ...f, status: "completed" as const } : f);
          }
          return prev.map(f => f.id === initialFile.id ? { ...f, progress: Math.min(f.progress + 10, 100) } : f);
        });
      }, 200);

      // Crear preview y extraer metadata en paralelo a la simulación de progreso
      let preview: string | undefined;
      if (originalFile.type.startsWith("image/") || originalFile.type === "application/pdf") {
        preview = URL.createObjectURL(originalFile);
      }

      let metadata = { dimensions: { width: 0, height: 0 }, resolution: 72 };
      try {
        metadata = await extractFileMetadata(originalFile) as any;
      } catch (error) {}

      // Actualizar estado con la metadata
      setUploadedFiles(prev => prev.map(f => 
        f.id === initialFile.id 
          ? { 
              ...f, 
              preview,
              metadata,
              material: uploadMode === "individual" ? individualInfo.material : f.material,
              alto: uploadMode === "individual" ? individualInfo.alto : f.alto,
              ancho: uploadMode === "individual" ? individualInfo.ancho : f.ancho,
              copias: uploadMode === "individual" ? individualInfo.copias : f.copias
            } 
          : f
      ));
    });
  };

  const removeFile = (id: string) => {
    const fileToRemove = uploadedFiles.find(f => f.id === id);
    if (fileToRemove?.preview) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const removeMultipleFiles = (ids: string[]) => {
    ids.forEach(id => {
      const fileToRemove = uploadedFiles.find(f => f.id === id);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
    });
    setUploadedFiles(prev => prev.filter(f => !ids.includes(f.id)));
    setSelectedFiles(prev => prev.filter(id => !ids.includes(id)));
  };

  // Funciones para modo lotes
  const handleFileSelection = (fileId: string, selected: boolean) => {
    if (fileId === 'all') {
      // Manejar selección/deselección de todos
      if (selected) {
        setSelectedFiles(uploadedFiles.map(file => file.id));
      } else {
        setSelectedFiles([]);
      }
    } else {
      // Manejar selección individual
      if (selected) {
        setSelectedFiles(prev => [...prev, fileId]);
      } else {
        setSelectedFiles(prev => prev.filter(id => id !== fileId));
      }
    }
  };

  const handleFileRemove = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
    setSelectedFiles(prev => prev.filter(id => id !== fileId));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <Image className="w-6 h-6" />;
    if (type.includes("pdf")) return <FileText className="w-6 h-6" />;
    return <File className="w-6 h-6" />;
  };

  const renderFileThumbnail = (file: UploadedFile, size: "small" | "medium" | "large" = "medium") => {
    const sizeClasses = {
      small: "w-12 h-12",
      medium: "w-full h-20",
      large: "w-full h-32"
    };

    if (file.preview) {
      if (file.type === "application/pdf") {
        return (
          <div className={`${sizeClasses[size]} bg-gray-100 rounded border flex items-center justify-center relative`}>
            <div className="text-center">
              <FileText className="w-6 h-6 text-red-500 mx-auto mb-1" />
              <span className="text-xs text-gray-600">PDF</span>
            </div>
          </div>
        );
      } else {
        return (
          <img 
            src={file.preview} 
            alt={file.name}
            className={`${sizeClasses[size]} object-cover rounded border`}
          />
        );
      }
    } else {
      return (
        <div className={`${sizeClasses[size]} bg-gray-100 rounded border flex items-center justify-center`}>
          {getFileIcon(file.type)}
        </div>
      );
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const openPreview = (file: UploadedFile) => {
    console.log("Abriendo preview para:", file.name, file);
    console.log("Preview URL:", file.preview);
    console.log("File type:", file.type);
    setSelectedFile(file);
  };

  const closePreview = () => {
    setSelectedFile(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar archivos O enlaces externos según el modo
    const hasFiles = uploadMode === "individual" ? uploadedFiles.length > 0 : selectedFiles.length > 0;
    const hasExternalLinks = (uploadMode === "individual" ? individualInfo.enlacesExternos : loteInfo.enlacesExternos).length > 0;
    
    if (!hasFiles && !hasExternalLinks) {
      alert("Por favor sube al menos un archivo o agrega un enlace externo");
      return;
    }

    const titulo = uploadMode === "individual" ? individualInfo.titulo : loteInfo.titulo;
    if (!titulo.trim()) {
      alert("Por favor ingresa un título para el pedido");
      return;
    }

    // Validar campos obligatorios
    if (uploadMode === "individual") {
      if (!individualInfo.clienteId.trim()) {
        alert("Por favor selecciona un cliente");
        return;
      }
      if (!individualInfo.material.trim()) {
        alert("Por favor selecciona un material");
        return;
      }
      if (!individualInfo.alto.trim() || !individualInfo.ancho.trim()) {
        alert("Por favor ingresa las medidas (alto y ancho)");
        return;
      }
      if (individualInfo.copias < 1) {
        alert("Por favor ingresa al menos 1 copia");
        return;
      }
    } else {
      if (!loteInfo.clienteId.trim()) {
        alert("Por favor selecciona un cliente");
        return;
      }
      if (!loteInfo.material.trim()) {
        alert("Por favor selecciona un material");
        return;
      }
      if (loteInfo.copias < 1) {
        alert("Por favor ingresa al menos 1 copia");
        return;
      }
    }

    // Crear nuevo pedido pendiente
    const filesToInclude = uploadMode === "individual" 
      ? uploadedFiles 
      : uploadedFiles.filter(file => selectedFiles.includes(file.id));
    
    const newOrder: PendingOrder = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      files: filesToInclude, // Solo archivos seleccionados en modo lotes
      info: uploadMode === "individual" ? individualInfo : loteInfo,
      mode: uploadMode
    };

    // Agregar a la lista de pedidos pendientes
    setPendingOrders(prev => [newOrder, ...prev]);

    console.log("Pedido agregado a pendientes:", newOrder);
    
    const mensaje = uploadMode === "individual" 
      ? "¡Trabajo individual agregado a la lista de pendientes!" 
      : `¡Lote de ${filesToInclude.length} archivos agregado a la lista de pendientes!`;
    
    alert(mensaje);
    
    // Limpiar formulario (NO revocar preview URLs aquí, se hará cuando se elimine el pedido)
    // Los preview URLs se mantienen para los pedidos pendientes
    
    if (uploadMode === "individual") {
      setIndividualInfo({
        titulo: "",
        descripcion: "",
        clienteId: "",
        material: "",
        alto: "",
        ancho: "",
        copias: 1,
        demasiaArribaAbajo: false,
        demasiaLaterales: false,
        demasiaCuatroLados: false,
        soldaduraPortabanner: false,
        rollbanner: false,
        estructuraPortabanner: false,
        estructuraRollbanner: false,
        laminado: false,
        instalacionRotuladoTensadoHerreria: false,
        enlacesExternos: []
      });
    } else {
      setLoteInfo({
        titulo: "",
        descripcion: "",
        clienteId: "",
        material: "",
        copias: 1,
        demasiaArribaAbajo: false,
        demasiaLaterales: false,
        demasiaCuatroLados: false,
        soldaduraPortabanner: false,
        rollbanner: false,
        estructuraPortabanner: false,
        estructuraRollbanner: false,
        laminado: false,
        instalacionRotuladoTensadoHerreria: false,
        enlacesExternos: []
      });
    }
    setUploadedFiles([]);
    setSelectedFiles([]); // Limpiar selección en modo lotes
  };

  const sendAllPendingOrders = () => {
    if (pendingOrders.length === 0) {
      alert("No hay pedidos pendientes para enviar");
      return;
    }

    console.log("Enviando todos los pedidos pendientes:", pendingOrders);
    alert(`¡${pendingOrders.length} pedidos enviados exitosamente! Te notificaremos cuando estén listos.`);
    
    // Limpiar todos los pedidos pendientes
    pendingOrders.forEach(order => {
      order.files.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    });
    setPendingOrders([]);
  };

  const removePendingOrder = (orderId: string) => {
    const orderToRemove = pendingOrders.find(o => o.id === orderId);
    if (orderToRemove) {
      orderToRemove.files.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    }
    setPendingOrders(prev => prev.filter(o => o.id !== orderId));
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Función para validar URLs
  const isValidUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // Función para detectar archivos comprimidos en la URL
  const isCompressedFile = (url: string): boolean => {
    const compressedExtensions = ['.zip', '.rar', '.7z', '.tar', '.gz'];
    return compressedExtensions.some(ext => url.toLowerCase().includes(ext));
  };

  // Función para agregar enlace externo
  const addExternalLink = (url: string, mode: "individual" | "lote") => {
    if (!isValidUrl(url)) {
      alert("Por favor ingresa una URL válida (http:// o https://)");
      return;
    }

    const newLink = {
      id: Math.random().toString(36).substr(2, 9),
      url: url,
      isCompressed: isCompressedFile(url),
      addedAt: new Date()
    };

    if (mode === "individual") {
      setIndividualInfo(prev => ({
        ...prev,
        enlacesExternos: [...prev.enlacesExternos, newLink]
      }));
    } else {
      setLoteInfo(prev => ({
        ...prev,
        enlacesExternos: [...prev.enlacesExternos, newLink]
      }));
    }
  };

  // Función para remover enlace externo
  const removeExternalLink = (linkId: string, mode: "individual" | "lote") => {
    if (mode === "individual") {
      setIndividualInfo(prev => ({
        ...prev,
        enlacesExternos: prev.enlacesExternos.filter(link => link.id !== linkId)
      }));
    } else {
      setLoteInfo(prev => ({
        ...prev,
        enlacesExternos: prev.enlacesExternos.filter(link => link.id !== linkId)
      }));
    }
  };

  // Función para obtener dimensiones físicas del archivo
  const getFilePhysicalDimensions = (file: UploadedFile) => {
    if (!file.metadata?.dimensions || !file.metadata?.resolution) return null;
    
    const widthInch = file.metadata.dimensions.width / file.metadata.resolution;
    const heightInch = file.metadata.dimensions.height / file.metadata.resolution;
    
    const widthCm = widthInch * 2.54;
    const heightCm = heightInch * 2.54;
    
    return { width: widthCm, height: heightCm };
  };

  // Función para verificar si las medidas coinciden
  const checkMeasurementsMatch = (file: UploadedFile) => {
    const fileDimensions = getFilePhysicalDimensions(file);
    if (!fileDimensions) return null;
    
    const formAlto = parseFloat(uploadMode === "individual" ? individualInfo.alto : "0");
    const formAncho = parseFloat(uploadMode === "individual" ? individualInfo.ancho : "0");
    
    if (!formAlto || !formAncho) return null;
    
    const tolerance = 1; // ±1 cm de tolerancia
    
    const altoMatch = Math.abs(fileDimensions.height - formAlto) <= tolerance;
    const anchoMatch = Math.abs(fileDimensions.width - formAncho) <= tolerance;
    
    return {
      alto: altoMatch,
      ancho: anchoMatch,
      fileDimensions
    };
  };

  // Función para obtener calidad de resolución
  const getResolutionQuality = (dpi: number) => {
    if (dpi >= 150) return { level: "Alta", color: "text-green-600 bg-green-100" };
    if (dpi >= 72) return { level: "Media", color: "text-yellow-600 bg-yellow-100" };
    return { level: "Baja", color: "text-red-600 bg-red-100" };
  };

  const extractFileMetadata = async (file: File): Promise<FileMetadata> => {
    console.log("extractFileMetadata iniciado para:", file.name, file.type);
    const metadata: FileMetadata = {};

    try {
      if (file.type.startsWith("image/")) {
        console.log("Procesando imagen:", file.name);
        // Para imágenes
        const img = document.createElement('img') as HTMLImageElement;
        const url = URL.createObjectURL(file);
        
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            console.log("Imagen cargada:", file.name);
            resolve();
          };
          img.onerror = () => {
            console.log("Error cargando imagen:", file.name);
            reject();
          };
          img.src = url;
        });

        // Dimensiones
        metadata.dimensions = {
          width: img.naturalWidth,
          height: img.naturalHeight
        };
        console.log("Dimensiones extraídas:", metadata.dimensions);

        // Intentar detectar color space (aproximación)
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = 1;
          canvas.height = 1;
          ctx.drawImage(img, 0, 0, 1, 1);
          const data = ctx.getImageData(0, 0, 1, 1).data;
          
          // Detección básica de color space
          if (data[3] < 255) {
            metadata.colorSpace = "Unknown"; // Con transparencia
          } else if (data[0] === data[1] && data[1] === data[2]) {
            metadata.colorSpace = "Grayscale";
          } else {
            metadata.colorSpace = "RGB"; // Por defecto
          }
        }

        // Cálculo de DPI basado en heurísticas mejoradas
        if (metadata.dimensions) {
          const fileSizeMB = file.size / (1024 * 1024);
          const totalPixels = metadata.dimensions.width * metadata.dimensions.height;
          const pixelsPerMB = totalPixels / fileSizeMB;

          console.log("Píxeles por MB:", pixelsPerMB);

          // Heurísticas mejoradas basadas en patrones reales
          if (pixelsPerMB > 2000000) {
            // Imágenes muy comprimidas, probablemente web o estándar
            metadata.resolution = 96;
          } else if (pixelsPerMB > 800000) {
            // Imágenes de alta calidad para impresión
            metadata.resolution = 300;
          } else if (pixelsPerMB > 300000) {
            // Imágenes de calidad media
            metadata.resolution = 150;
          } else if (pixelsPerMB > 100000) {
            // Imágenes web optimizadas
            metadata.resolution = 96;
          } else {
            // Imágenes muy comprimidas o de baja calidad
            metadata.resolution = 72;
          }
        }

        URL.revokeObjectURL(url);
      } else if (file.type === "application/pdf") {
        console.log("Procesando PDF:", file.name);
        // Para PDFs
        metadata.colorSpace = "Unknown"; // Los PDFs pueden tener múltiples espacios
        metadata.pages = 1; // Por defecto, se podría mejorar con una librería PDF
        metadata.resolution = 300; // Resolución típica para impresión
      } else {
        console.log("Tipo de archivo no soportado:", file.type);
      }
    } catch (error) {
      console.log("Error extrayendo metadata:", error);
    }

    console.log("Metadata final:", metadata);
    return metadata;
  };

  const getColorSpaceColor = (colorSpace?: string) => {
    switch (colorSpace) {
      case "RGB":
        return "text-green-600 bg-green-100";
      case "CMYK":
        return "text-blue-600 bg-blue-100";
      case "Grayscale":
        return "text-gray-600 bg-gray-100";
      default:
        return "text-orange-600 bg-orange-100";
    }
  };

  const getColorSpaceIcon = (colorSpace?: string) => {
    switch (colorSpace) {
      case "RGB":
        return "🟢";
      case "CMYK":
        return "🔵";
      case "Grayscale":
        return "⚫";
      default:
        return "❓";
    }
  };

  const FileMetadataDisplay = ({ file, compact = false }: { file: UploadedFile; compact?: boolean }) => {
    if (!file.metadata) return null;

    if (compact) {
      // Vista compacta para espacios pequeños
      return (
        <div className="flex flex-wrap gap-1 mt-1">
          {file.metadata.colorSpace && (
            <span className={`text-xs px-1 py-0.5 rounded ${getColorSpaceColor(file.metadata.colorSpace)}`}>
              {file.metadata.colorSpace}
            </span>
          )}
          {file.metadata.resolution && (
            <span className="text-xs text-gray-600 bg-gray-100 px-1 py-0.5 rounded">
              {file.metadata.resolution} DPI
            </span>
          )}
          {file.metadata.dimensions && (
            <span className="text-xs text-gray-600 bg-gray-100 px-1 py-0.5 rounded">
              {file.metadata.dimensions.width}×{file.metadata.dimensions.height}
            </span>
          )}
        </div>
      );
    }

    return (
      <div className="mt-2 space-y-1">
        {/* Color Space */}
        {file.metadata.colorSpace && (
          <div className="flex items-center space-x-1">
            <span className="text-xs">{getColorSpaceIcon(file.metadata.colorSpace)}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${getColorSpaceColor(file.metadata.colorSpace)}`}>
              {file.metadata.colorSpace}
            </span>
          </div>
        )}

        {/* Resolución y Calidad */}
        {file.metadata.resolution && (
          <div className="flex items-center space-x-1">
            <span className="text-xs">📏</span>
            <span className="text-xs text-gray-600">
              {file.metadata.resolution} DPI
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${getResolutionQuality(file.metadata.resolution).color}`}>
              {getResolutionQuality(file.metadata.resolution).level} calidad
            </span>
          </div>
        )}

        {/* Dimensiones */}
        {file.metadata.dimensions && (
          <div className="flex items-center space-x-1">
            <span className="text-xs">📐</span>
            <span className="text-xs text-gray-600">
              {file.metadata.dimensions.width} × {file.metadata.dimensions.height} px
            </span>
          </div>
        )}

        {/* Dimensiones físicas */}
        {(() => {
          const physicalDimensions = getFilePhysicalDimensions(file);
          if (physicalDimensions) {
            return (
              <div className="flex items-center space-x-1">
                <span className="text-xs">📏</span>
                <span className="text-xs text-gray-600">
                  {physicalDimensions.width.toFixed(1)} × {physicalDimensions.height.toFixed(1)} cm
                </span>
                {(() => {
                  const match = checkMeasurementsMatch(file);
                  if (match && (!match.alto || !match.ancho)) {
                    return <span className="text-xs text-orange-500">⚠️</span>;
                  }
                  return null;
                })()}
              </div>
            );
          }
          return null;
        })()}

        {/* Páginas (PDFs) */}
        {file.metadata.pages && file.metadata.pages > 1 && (
          <div className="flex items-center space-x-1">
            <span className="text-xs">📄</span>
            <span className="text-xs text-gray-600">
              {file.metadata.pages} páginas
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Subir Archivos para Nuevo Trabajo 📁
        </h1>
        <p className="text-gray-600 mb-4">
          Sube archivos de diseño y completa la información del trabajo. Los trabajos se irán acumulando hasta que los envíes.
        </p>

        {/* Toggle de Modo */}
        <div className="flex items-center justify-center">
          <div className="bg-gray-100 rounded-lg p-1 flex items-center">
            <button
              onClick={() => setUploadMode("individual")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 ${
                uploadMode === "individual"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              <FileUp className="w-4 h-4" />
              <span className="font-medium">Individual</span>
            </button>
            <button
              onClick={() => setUploadMode("lote")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 ${
                uploadMode === "lote"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              <Package className="w-4 h-4" />
              <span className="font-medium">Lote</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Información del Pedido */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 lg:col-span-3">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            {uploadMode === "individual" ? (
              <>
                <FileUp className="w-5 h-5 mr-2 text-blue-600" />
                Información del Trabajo Individual
              </>
            ) : (
              <>
                <Package className="w-5 h-5 mr-2 text-blue-600" />
                Información del Lote
              </>
            )}
          </h2>
          
          {/* Instrucciones específicas para lotes */}
          {uploadMode === "lote" && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-blue-800">
                    Configuración Aplicada a Todos los Archivos
                  </h3>
                  <p className="text-sm text-blue-700 leading-relaxed">
                    Los campos de Material y Copias se aplicarán a <strong>todos los archivos seleccionados</strong> por igual. 
                    Se considera que los archivos están ya a medida y van en un mismo material. 
                    Si necesitas distintos archivos en distintos materiales, usa un lote por material.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título del Trabajo *
              </label>
              <input
                type="text"
                value={uploadMode === "individual" ? individualInfo.titulo : loteInfo.titulo}
                onChange={(e) => {
                  if (uploadMode === "individual") {
                    setIndividualInfo(prev => ({ ...prev, titulo: e.target.value }));
                  } else {
                    setLoteInfo(prev => ({ ...prev, titulo: e.target.value }));
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={uploadMode === "individual" ? "Ej: Diseño para lona publicitaria" : "Ej: Lote de 10 diseños"}
                required
              />
            </div>

            {/* Selector de Cliente */}
            <ClientSelector
              selectedClientId={uploadMode === "individual" ? individualInfo.clienteId : loteInfo.clienteId}
              onClientChange={(clientId) => {
                if (uploadMode === "individual") {
                  setIndividualInfo(prev => ({ ...prev, clienteId: clientId }));
                } else {
                  setLoteInfo(prev => ({ ...prev, clienteId: clientId }));
                }
              }}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                value={uploadMode === "individual" ? individualInfo.descripcion : loteInfo.descripcion}
                onChange={(e) => {
                  if (uploadMode === "individual") {
                    setIndividualInfo(prev => ({ ...prev, descripcion: e.target.value }));
                  } else {
                    setLoteInfo(prev => ({ ...prev, descripcion: e.target.value }));
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Describe los detalles del trabajo..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Material *
                </label>
                <SimpleMaterialSelector
                  selectedMaterial={uploadMode === "individual" ? individualInfo.material : loteInfo.material}
                  onMaterialChange={(materialId) => {
                    try {
                      const material = getMaterialById(materialId);
                      const needsDemasia = material?.needsDemasia ?? false;
                      
                      if (uploadMode === "individual") {
                        setIndividualInfo(prev => ({ 
                          ...prev, 
                          material: materialId,
                          // Limpiar demasías si el material no las necesita
                          demasiaArribaAbajo: needsDemasia ? prev.demasiaArribaAbajo : false,
                          demasiaLaterales: needsDemasia ? prev.demasiaLaterales : false,
                          demasiaCuatroLados: needsDemasia ? prev.demasiaCuatroLados : false
                        }));
                      } else {
                        setLoteInfo(prev => ({ 
                          ...prev, 
                          material: materialId,
                          // Limpiar demasías si el material no las necesita
                          demasiaArribaAbajo: needsDemasia ? prev.demasiaArribaAbajo : false,
                          demasiaLaterales: needsDemasia ? prev.demasiaLaterales : false,
                          demasiaCuatroLados: needsDemasia ? prev.demasiaCuatroLados : false
                        }));
                      }
                    } catch (error) {
                      console.error("Error al cambiar material:", error);
                      // Fallback: solo cambiar el material sin tocar las demasías
                      if (uploadMode === "individual") {
                        setIndividualInfo(prev => ({ ...prev, material: materialId }));
                      } else {
                        setLoteInfo(prev => ({ ...prev, material: materialId }));
                      }
                    }
                  }}
                  className={`${
                    (uploadMode === "individual" ? !individualInfo.material.trim() : !loteInfo.material.trim())
                      ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                      : ""
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Copias *
                </label>
                <input
                  type="number"
                  min="1"
                  value={uploadMode === "individual" ? individualInfo.copias : loteInfo.copias}
                  onChange={(e) => {
                    if (uploadMode === "individual") {
                      setIndividualInfo(prev => ({ ...prev, copias: parseInt(e.target.value) }));
                    } else {
                      setLoteInfo(prev => ({ ...prev, copias: parseInt(e.target.value) }));
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                    (uploadMode === "individual" ? individualInfo.copias < 1 : loteInfo.copias < 1)
                      ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  }`}
                />
              </div>
            </div>

            {/* Checkboxes de demasías - Solo para materiales que no son vinilos */}
            {(() => {
              try {
                const currentMaterial = uploadMode === "individual" ? individualInfo.material : loteInfo.material;
                const material = getMaterialById(currentMaterial);
                const needsDemasia = material?.needsDemasia ?? false;
                
                if (needsDemasia) {
                  return (
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Demasía de tensado (5 cm cada lado)
                      </label>
                      
                      <div className="space-y-2">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={uploadMode === "individual" ? individualInfo.demasiaArribaAbajo : loteInfo.demasiaArribaAbajo}
                            onChange={(e) => {
                              if (uploadMode === "individual") {
                                setIndividualInfo(prev => ({ 
                                  ...prev, 
                                  demasiaArribaAbajo: e.target.checked,
                                  // Si se selecciona arriba/abajo, desmarcar cuatro lados
                                  demasiaCuatroLados: e.target.checked ? false : prev.demasiaCuatroLados
                                }));
                              } else {
                                setLoteInfo(prev => ({ 
                                  ...prev, 
                                  demasiaArribaAbajo: e.target.checked,
                                  demasiaCuatroLados: e.target.checked ? false : prev.demasiaCuatroLados
                                }));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">Arriba y abajo de la impresión <span className="text-gray-500">(Tipo de demasía para banners)</span></span>
                        </label>
                        
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={uploadMode === "individual" ? individualInfo.demasiaLaterales : loteInfo.demasiaLaterales}
                            onChange={(e) => {
                              if (uploadMode === "individual") {
                                setIndividualInfo(prev => ({ 
                                  ...prev, 
                                  demasiaLaterales: e.target.checked,
                                  // Si se selecciona laterales, desmarcar cuatro lados
                                  demasiaCuatroLados: e.target.checked ? false : prev.demasiaCuatroLados
                                }));
                              } else {
                                setLoteInfo(prev => ({ 
                                  ...prev, 
                                  demasiaLaterales: e.target.checked,
                                  demasiaCuatroLados: e.target.checked ? false : prev.demasiaCuatroLados
                                }));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">Solo laterales</span>
                        </label>
                        
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={uploadMode === "individual" ? individualInfo.demasiaCuatroLados : loteInfo.demasiaCuatroLados}
                            onChange={(e) => {
                              if (uploadMode === "individual") {
                                setIndividualInfo(prev => ({ 
                                  ...prev, 
                                  demasiaCuatroLados: e.target.checked,
                                  // Si se selecciona cuatro lados, desmarcar los otros
                                  demasiaArribaAbajo: e.target.checked ? false : prev.demasiaArribaAbajo,
                                  demasiaLaterales: e.target.checked ? false : prev.demasiaLaterales
                                }));
                              } else {
                                setLoteInfo(prev => ({ 
                                  ...prev, 
                                  demasiaCuatroLados: e.target.checked,
                                  demasiaArribaAbajo: e.target.checked ? false : prev.demasiaArribaAbajo,
                                  demasiaLaterales: e.target.checked ? false : prev.demasiaLaterales
                                }));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">Hacia los 4 lados del diseño</span>
                        </label>
                    </div>
                    
                    <p className="text-xs text-gray-500">
                      Selecciona el tipo de demasía necesario para el tensado del material
                    </p>
                  </div>
                );
              }
              
              // Mostrar mensaje informativo para materiales que no necesitan demasías
              if (!needsDemasia && currentMaterial) {
                return (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                                              <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-800 font-medium">
                        Este material no requiere demasía de tensado
                      </span>
                    </div>
                    <p className="text-xs text-green-700 mt-1">
                      Los vinilos autoadhesivos se aplican directamente sin necesidad de tensado adicional.
                    </p>
                  </div>
                );
              }
              
              return null;
            } catch (error) {
              console.error("Error al renderizar sección de demasías:", error);
              return null;
            }
          })()}

            {/* Sección de Manufactura Adicional */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-2">
                Manufactura Adicional <span className="text-xs text-gray-500 italic font-bold">(tiene costo extra)</span>
              </h4>
              
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={uploadMode === "individual" ? individualInfo.soldaduraPortabanner : loteInfo.soldaduraPortabanner}
                    onChange={(e) => {
                      if (uploadMode === "individual") {
                        setIndividualInfo(prev => ({ ...prev, soldaduraPortabanner: e.target.checked }));
                      } else {
                        setLoteInfo(prev => ({ ...prev, soldaduraPortabanner: e.target.checked }));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Soldadura para Portabanner</span>
                </label>
                
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={uploadMode === "individual" ? individualInfo.rollbanner : loteInfo.rollbanner}
                    onChange={(e) => {
                      if (uploadMode === "individual") {
                        setIndividualInfo(prev => ({ ...prev, rollbanner: e.target.checked }));
                      } else {
                        setLoteInfo(prev => ({ ...prev, rollbanner: e.target.checked }));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Rollbanner</span>
                </label>
              </div>
              
              <p className="text-xs text-gray-500">
                Selecciona los servicios de manufactura adicionales necesarios
              </p>
            </div>

            {/* Sección de Extras */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-2">
                Extras <span className="text-xs text-gray-500 italic font-bold">(tiene costo extra)</span>
              </h4>
              
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={uploadMode === "individual" ? individualInfo.estructuraPortabanner : loteInfo.estructuraPortabanner}
                    onChange={(e) => {
                      if (uploadMode === "individual") {
                        setIndividualInfo(prev => ({ ...prev, estructuraPortabanner: e.target.checked }));
                      } else {
                        setLoteInfo(prev => ({ ...prev, estructuraPortabanner: e.target.checked }));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Estructura de Portabanner</span>
                </label>
                
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={uploadMode === "individual" ? individualInfo.estructuraRollbanner : loteInfo.estructuraRollbanner}
                    onChange={(e) => {
                      if (uploadMode === "individual") {
                        setIndividualInfo(prev => ({ ...prev, estructuraRollbanner: e.target.checked }));
                      } else {
                        setLoteInfo(prev => ({ ...prev, estructuraRollbanner: e.target.checked }));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Estructura de Rollbanner</span>
                </label>
                
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={uploadMode === "individual" ? individualInfo.laminado : loteInfo.laminado}
                    onChange={(e) => {
                      if (uploadMode === "individual") {
                        setIndividualInfo(prev => ({ ...prev, laminado: e.target.checked }));
                      } else {
                        setLoteInfo(prev => ({ ...prev, laminado: e.target.checked }));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Laminado</span>
                </label>
                
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={uploadMode === "individual" ? individualInfo.instalacionRotuladoTensadoHerreria : loteInfo.instalacionRotuladoTensadoHerreria}
                    onChange={(e) => {
                      if (uploadMode === "individual") {
                        setIndividualInfo(prev => ({ ...prev, instalacionRotuladoTensadoHerreria: e.target.checked }));
                      } else {
                        setLoteInfo(prev => ({ ...prev, instalacionRotuladoTensadoHerreria: e.target.checked }));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Instalación/Rotulado/Tensado/Herrería</span>
                </label>
              </div>
              
              <p className="text-xs text-gray-500">
                Selecciona las estructuras adicionales necesarias
              </p>
            </div>

            {/* Campos específicos para archivos individuales */}
            {uploadMode === "individual" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alto (cm) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    value={individualInfo.alto}
                    onChange={(e) => setIndividualInfo(prev => ({ ...prev, alto: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                      !individualInfo.alto.trim()
                        ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                        : uploadedFiles.length > 0 && individualInfo.alto && individualInfo.ancho &&
                          checkMeasurementsMatch(uploadedFiles[0]) &&
                          !checkMeasurementsMatch(uploadedFiles[0])?.alto
                            ? "border-orange-300 bg-orange-50 focus:ring-orange-500"
                            : "border-gray-300 focus:ring-blue-500"
                    }`}
                    placeholder="Ej: 100"
                  />
                  {uploadedFiles.length > 0 && individualInfo.alto && individualInfo.ancho &&
                   checkMeasurementsMatch(uploadedFiles[0]) &&
                   !checkMeasurementsMatch(uploadedFiles[0])?.alto && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                      <span className="text-orange-500 text-xs">⚠️</span>
                      <span className="text-orange-600 text-xs font-medium">
                        {checkMeasurementsMatch(uploadedFiles[0])?.fileDimensions.height.toFixed(1)} cm
                      </span>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ancho (cm) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    value={individualInfo.ancho}
                    onChange={(e) => setIndividualInfo(prev => ({ ...prev, ancho: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                      !individualInfo.ancho.trim()
                        ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                        : uploadedFiles.length > 0 && individualInfo.alto && individualInfo.ancho &&
                          checkMeasurementsMatch(uploadedFiles[0]) &&
                          !checkMeasurementsMatch(uploadedFiles[0])?.ancho
                            ? "border-orange-300 bg-orange-50 focus:ring-orange-500"
                            : "border-gray-300 focus:ring-blue-500"
                    }`}
                    placeholder="Ej: 200"
                  />
                  {uploadedFiles.length > 0 && individualInfo.alto && individualInfo.ancho &&
                   checkMeasurementsMatch(uploadedFiles[0]) &&
                   !checkMeasurementsMatch(uploadedFiles[0])?.ancho && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                      <span className="text-orange-500 text-xs">⚠️</span>
                      <span className="text-orange-600 text-xs font-medium">
                        {checkMeasurementsMatch(uploadedFiles[0])?.fileDimensions.width.toFixed(1)} cm
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Subida de Archivos */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            {uploadMode === "individual" ? (
              <>
                <FileUp className="w-5 h-5 mr-2 text-blue-600" />
                Archivo de Diseño
              </>
            ) : (
              <>
                <Package className="w-5 h-5 mr-2 text-blue-600" />
                Archivos del Lote
              </>
            )}
          </h2>
          
          {/* Área de Drop */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver 
                ? "border-blue-500 bg-blue-50" 
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            {uploadMode === "individual" ? (
              <FileUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            ) : (
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            )}
            <p className="text-gray-600 mb-2">
              {uploadMode === "individual" 
                ? "Arrastra y suelta un archivo aquí, o"
                : "Arrastra y suelta múltiples archivos aquí, o"
              }
            </p>
            <label className="cursor-pointer">
              <span className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                {uploadMode === "individual" ? "Seleccionar archivo" : "Seleccionar archivos"}
              </span>
              <input
                type="file"
                id="file-upload"
                multiple={uploadMode === "lote"}
                accept=".pdf,.ai,.psd,.jpg,.jpeg,.png,.tiff,.eps"
                onChange={handleFileInput}
                onClick={() => console.log("Input file clickeado")}
                className="hidden"
              />
            </label>

            <p className="text-sm text-gray-500 mt-2">
              PDF, AI, PSD, JPG, PNG, TIFF, EPS (máx. 50MB)
              {uploadMode === "lote" && " - Hasta 25 archivos permitidos"}
            </p>
          </div>

          {/* Sección de Enlaces Externos */}
          <div className="mt-6 border-t border-gray-200 pt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <span className="text-lg mr-2">🔗</span>
              Enlaces Externos (Opcional)
            </h3>
            
            <div className="space-y-3">
              {/* Input para agregar enlace */}
              <div className="flex space-x-2">
                <div className="flex-1">
                  <input
                    type="url"
                    value={externalLinkInput}
                    onChange={(e) => setExternalLinkInput(e.target.value)}
                    placeholder="https://wetransfer.com/... o https://drive.google.com/..."
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                      externalLinkInput && !isValidUrl(externalLinkInput)
                        ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                        : externalLinkInput && isValidUrl(externalLinkInput)
                        ? "border-green-300 focus:ring-green-500 focus:border-green-500"
                        : "border-gray-300 focus:ring-blue-500"
                    }`}
                  />
                  {externalLinkInput && !isValidUrl(externalLinkInput) && (
                    <p className="text-red-500 text-xs mt-1">
                      Por favor ingresa una URL válida (http:// o https://)
                    </p>
                  )}
                  {externalLinkInput && isValidUrl(externalLinkInput) && isCompressedFile(externalLinkInput) && (
                    <p className="text-blue-600 text-xs mt-1 flex items-center">
                      <span className="mr-1">📦</span>
                      Archivo comprimido detectado
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (externalLinkInput.trim()) {
                      addExternalLink(externalLinkInput.trim(), uploadMode);
                      setExternalLinkInput("");
                    }
                  }}
                  disabled={!externalLinkInput.trim() || !isValidUrl(externalLinkInput)}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Agregar
                </button>
              </div>

              {/* Lista de enlaces agregados */}
              {(uploadMode === "individual" ? individualInfo.enlacesExternos : loteInfo.enlacesExternos).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-600 font-medium">
                    Enlaces agregados:
                  </p>
                  {(uploadMode === "individual" ? individualInfo.enlacesExternos : loteInfo.enlacesExternos).map((link) => (
                    <div key={link.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-blue-600">🔗</span>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 truncate"
                            title={link.url}
                          >
                            {link.url}
                          </a>
                        </div>
                        {link.isCompressed && (
                          <p className="text-xs text-blue-600 mt-1 flex items-center">
                            <span className="mr-1">📦</span>
                            Archivo comprimido
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => removeExternalLink(link.id, uploadMode)}
                        className="text-red-500 hover:text-red-700 ml-2"
                        title="Eliminar enlace"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Lista de archivos */}
          {uploadedFiles.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">
                  {uploadMode === "individual" ? "Archivo subido:" : `Archivos subidos (${uploadedFiles.length}):`}
                </h3>
                {uploadMode === "lote" && uploadedFiles.length > 1 && (
                  <button
                    onClick={() => removeMultipleFiles(selectedFiles.length > 0 ? selectedFiles : uploadedFiles.map(f => f.id))}
                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                  >
                    {selectedFiles.length > 0 ? `Eliminar seleccionados (${selectedFiles.length})` : "Eliminar todos"}
                  </button>
                )}
              </div>
              
              {uploadMode === "individual" ? (
                // Vista individual
                <div className="space-y-3">
                  {uploadedFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          {renderFileThumbnail(file, "small")}
                          <button
                            onClick={() => openPreview(file)}
                            className="absolute -top-1 -right-1 bg-blue-600 text-white p-1 rounded-full hover:bg-blue-700 transition-colors z-10"
                            title="Ver preview"
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                        </div>
                                                 <div className="flex-1">
                           <p className="text-sm font-medium text-gray-900">{file.name}</p>
                           <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                           <FileMetadataDisplay file={file} />
                         </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {file.status === "uploading" && (
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                        )}
                        {file.status === "completed" && (
                          <span className="text-green-600 text-sm">✓ Completado</span>
                        )}
                        <button
                          onClick={() => openPreview(file)}
                          className="text-blue-600 hover:text-blue-700 p-1"
                          title="Ver preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeFile(file.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Vista de grilla para lotes con selección
                <FileGrid
                  files={uploadedFiles}
                  selectedFiles={selectedFiles}
                  onFileSelect={handleFileSelection}
                  onFileRemove={handleFileRemove}
                  onFilePreview={openPreview}
                  maxFiles={25}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Botón de envío */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <button
          onClick={handleSubmit}
          disabled={uploadedFiles.length === 0 || 
            (uploadMode === "individual" ? !individualInfo.titulo.trim() : !loteInfo.titulo.trim())}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-medium transition-colors"
        >
          {uploadMode === "individual" ? "Agregar a Lista de Pendientes" : `Agregar Lote a Pendientes (${uploadedFiles.length} archivos)`}
        </button>
      </div>

      {/* Lista de Pedidos Pendientes */}
      {pendingOrders.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-orange-600" />
              Trabajos Pendientes ({pendingOrders.length})
            </h2>
            <button
              onClick={sendAllPendingOrders}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>Enviar Todos</span>
            </button>
          </div>

          <div className="space-y-4">
            {pendingOrders.map((order) => (
              <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {order.mode === "individual" ? (
                        <FileUp className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Package className="w-4 h-4 text-blue-600" />
                      )}
                      <h3 className="font-medium text-gray-900">{order.info.titulo}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.mode === "individual" 
                          ? "bg-blue-100 text-blue-800" 
                          : "bg-purple-100 text-purple-800"
                      }`}>
                        {order.mode === "individual" ? "Individual" : "Lote"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{order.info.descripcion}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      {(() => {
                        const client = getClientById(order.info.clienteId);
                        return client ? (
                          <span className="text-blue-600 font-medium">
                            Cliente: {client.name}
                          </span>
                        ) : null;
                      })()}
                      <span>Material: {getMaterialById(order.info.material)?.displayName || order.info.material}</span>
                      <span>Copias: {order.info.copias}</span>
                      {order.info.alto && order.info.ancho && (
                        <span>Medidas: {order.info.alto}cm x {order.info.ancho}cm</span>
                      )}
                      {(() => {
                        const demasias = [];
                        if (order.info.demasiaArribaAbajo) demasias.push("Arriba/Abajo");
                        if (order.info.demasiaLaterales) demasias.push("Laterales");
                        if (order.info.demasiaCuatroLados) demasias.push("4 lados");
                        
                        if (demasias.length > 0) {
                          return <span>Demasía: {demasias.join(", ")}</span>;
                        }
                        return null;
                      })()}
                      {(() => {
                        const manufacturas = [];
                        if (order.info.soldaduraPortabanner) manufacturas.push("Soldadura");
                        if (order.info.rollbanner) manufacturas.push("Rollbanner");
                        
                        if (manufacturas.length > 0) {
                          return <span>Manufactura: {manufacturas.join(", ")}</span>;
                        }
                        return null;
                      })()}
                      {(() => {
                                        const extras = [];
                if (order.info.estructuraPortabanner) extras.push("Estructura Portabanner");
                if (order.info.estructuraRollbanner) extras.push("Estructura Rollbanner");
                if (order.info.laminado) extras.push("Laminado");
                if (order.info.instalacionRotuladoTensadoHerreria) extras.push("Instalación/Rotulado/Tensado/Herrería");
                
                if (extras.length > 0) {
                  return <span>Extras: {extras.join(", ")}</span>;
                }
                        return null;
                      })()}
                      <span>Archivos: {order.files.length}</span>
                      <span>{formatTimestamp(order.timestamp)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => removePendingOrder(order.id)}
                    className="text-red-500 hover:text-red-700 ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Vista de archivos del pedido */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {order.files.map((file) => (
                    <div key={file.id} className="relative group">
                      <div className="bg-gray-50 rounded p-2 border border-gray-200">
                        <div className="relative">
                          {renderFileThumbnail(file, "small")}
                          <button
                            onClick={() => openPreview(file)}
                            className="absolute top-0 right-0 bg-blue-600 text-white p-1 rounded-full hover:bg-blue-700 transition-colors opacity-0 group-hover:opacity-100 z-10"
                            title="Ver preview"
                          >
                            <Eye className="w-2 h-2" />
                          </button>
                        </div>
                                                 <p className="text-xs font-medium text-gray-900 truncate mt-1" title={file.name}>
                           {file.name}
                         </p>
                         <div className="mt-1">
                           <FileMetadataDisplay file={file} compact={true} />
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Preview */}
      {selectedFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{selectedFile.name}</h3>
              <button
                onClick={closePreview}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {selectedFile.preview && (
              <div className="w-full h-[70vh] flex items-center justify-center">
                {selectedFile.type === "application/pdf" ? (
                  <iframe
                    src={selectedFile.preview}
                    className="w-full h-full border rounded"
                    title={selectedFile.name}
                  />
                ) : (
                  <img 
                    src={selectedFile.preview} 
                    alt={selectedFile.name}
                    className="max-w-full max-h-full object-contain mx-auto"
                    onError={(e) => console.log("Error loading image:", e)}
                    onLoad={() => console.log("Image loaded successfully")}
                  />
                )}
              </div>
            )}
            {!selectedFile.preview && (
              <div className="w-full h-[70vh] flex items-center justify-center text-gray-500">
                <p>No se pudo cargar la vista previa del archivo</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 