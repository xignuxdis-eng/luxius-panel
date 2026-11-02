// content/xanaTips.ts - TABLÓN DE XANA: consejos tipo "feed de noticias" (solo datos, editable).
// Curados a mano por el equipo: NO son datos del sistema ni se generan solos. Para agregar uno, copiá un bloque y
// cambiá `id` (único), `category`, `title`, `text` y, si querés, `link`. Se ordena por aparición (arriba = primero).
// Verificá que los sitios sigan activos antes de agregarlos; usá solo enlaces confiables. Sin chistes sobre clientes.

export type XanaCategory = 'diseno' | 'granformato' | 'color' | 'sitios' | 'tutoriales' | 'taller' | 'curiosidades' | 'xana';

export interface XanaCategoryInfo {
    label: string;
    icon: string;
    color: string;
}

export const XANA_CATEGORIES: Record<XanaCategory, XanaCategoryInfo> = {
    diseno: { label: 'Diseño', icon: '🎨', color: '#f472b6' },
    granformato: { label: 'Gran formato', icon: '🖨️', color: '#38bdf8' },
    color: { label: 'Color y tipografía', icon: '🔤', color: '#a78bfa' },
    sitios: { label: 'Sitios útiles', icon: '🌐', color: '#34d399' },
    tutoriales: { label: 'Tutoriales', icon: '🎓', color: '#fbbf24' },
    taller: { label: 'Taller', icon: '🛠️', color: '#fb923c' },
    curiosidades: { label: 'Curiosidades', icon: '💡', color: '#22d3ee' },
    xana: { label: 'Xana', icon: '✨', color: '#c084fc' }
};

export interface XanaTip {
    id: string;
    category: XanaCategory;
    title: string;
    text: string;
    link?: { label: string; url: string };
}

export const XANA_TIPS: XanaTip[] = [
    {
        id: "d-jerarquia",
        category: "diseno",
        title: "Un solo protagonista",
        text: "Si todo es grande y en negrita, nada se destaca. Armá 3 niveles (título, subtítulo y texto) y dejá que un solo elemento mande la mirada."
    },
    {
        id: "d-aire",
        category: "diseno",
        title: "El espacio en blanco también diseña",
        text: "El aire alrededor de un elemento no es espacio perdido: le da importancia y descanso a la vista. Ante la duda, sacá un elemento en vez de agregar otro."
    },
    {
        id: "d-alineacion",
        category: "diseno",
        title: "Elegí una línea y respetala",
        text: "Alinear todo a una misma línea (la izquierda suele ser la más legible) da orden inmediato. Evitá mezclar muchas alineaciones en el mismo diseño."
    },
    {
        id: "d-tercios",
        category: "diseno",
        title: "Regla de los tercios",
        text: "Dividí la imagen en una grilla de 3×3 y poné el punto de interés sobre una intersección. Las composiciones centradas funcionan, pero las desplazadas suelen sentirse más dinámicas."
    },
    {
        id: "d-proporcion",
        category: "diseno",
        title: "Nunca estires un logo",
        text: "Al redimensionar logos e imágenes mantené la proporción (en la mayoría de los programas, con Shift). Un logo deformado le resta seriedad a cualquier marca."
    },
    {
        id: "d-vectorial",
        category: "diseno",
        title: "Guardá siempre el original vectorial",
        text: "Un logo en vector (AI, SVG, PDF) se puede ampliar sin perder calidad, desde una tarjeta hasta una fachada. Pedilo siempre y archivalo junto a la orden."
    },
    {
        id: "d-fuentes",
        category: "diseno",
        title: "Máximo dos familias tipográficas",
        text: "Combinar más de dos fuentes suele ensuciar el diseño. Una opción segura: una familia para títulos y otra, más neutra, para el texto."
    },
    {
        id: "d-escala-visual",
        category: "diseno",
        title: "Contraste de escalas",
        text: "Para generar impacto rápido en vía pública, combiná un elemento tipográfico o gráfico muy grande frente a detalles sutiles de lectura secundaria."
    },
    {
        id: "d-agrupacion",
        category: "diseno",
        title: "Ley de proximidad Gestalt",
        text: "Los elementos que se ubican cerca entre sí son percibidos como un único grupo o bloque temático. Separá bloques distintos con márgenes generosos."
    },
    {
        id: "d-peso-visual",
        category: "diseno",
        title: "Equilibrio y peso visual",
        text: "Los colores oscuros, las formas complejas y los bloques grandes pesan visualmente más. Balanceá la composición para que no se sienta inclinada hacia un lado."
    },
    {
        id: "d-ritmo-modular",
        category: "diseno",
        title: "Retículas y grillas modulares",
        text: "Diseñar sobre columnas y líneas guía invisibles aporta consistencia y acelera la toma de decisiones sobre dónde apoyar textos e imágenes."
    },
    {
        id: "d-lectura-z",
        category: "diseno",
        title: "Patrón de lectura en Z y en F",
        text: "En piezas horizontales y marquesinas, el ojo suele entrar por la esquina superior izquierda, cruzar al centro y rematar abajo a la derecha."
    },
    {
        id: "d-contrastes-formas",
        category: "diseno",
        title: "Contraste orgánico vs geométrico",
        text: "Combinar tipografías geométricas sólidas con trazos o fotos de siluetas fluidas crea una tensión visual atractiva y moderna."
    },
    {
        id: "d-recortes-impecables",
        category: "diseno",
        title: "Máscaras en vez de borrar píxeles",
        text: "Nunca borres el fondo destructivamente con la goma. Usá máscaras de capa (Layer Masks): si necesitás recuperar un mechón o borde, está intacto."
    },
    {
        id: "d-objetos-inteligentes",
        category: "diseno",
        title: "Objetos inteligentes siempre",
        text: "En Photoshop, convertí capas y logos en Smart Objects antes de escalarlos o rotarlos. Así no pierden resolución si los achicás y volvés a agrandar."
    },
    {
        id: "d-marcas-consistentes",
        category: "diseno",
        title: "Manual de marca a mano",
        text: "Respetá las áreas de resguardo y los colores exactos de los manuales de identidad corporativa. Cambiar el tono del logo corporativo arruina el trabajo."
    },
    {
        id: "d-iconos-homogeneos",
        category: "diseno",
        title: "Iconografía con el mismo grosor",
        text: "Si usás íconos para redes, teléfono o servicios, asegurate de que todos tengan el mismo grosor de trazo (stroke) y estilo visual (relleno o lineal)."
    },
    {
        id: "d-simplificacion",
        category: "diseno",
        title: "Menos es más en cartelería",
        text: "Un cartel en la calle se lee en 3 segundos. Si tiene 10 líneas de texto, nadie lo va a leer entero: priorizá nombre, rubro y forma de contacto."
    },
    {
        id: "d-silueteado",
        category: "diseno",
        title: "Calado con pluma bezier",
        text: "Para siluetear productos o personas con destino a gigantografías, la herramienta Pluma (Pen Tool) vectorial siempre da bordes más limpios que la varita mágica."
    },
    {
        id: "d-ruido-texturas",
        category: "diseno",
        title: "Sutil grano anti-banding",
        text: "Si un degradé en gran formato genera bandas visibles (banding escalonado), sumarle un 1% o 2% de ruido monocromático suaviza la transición perfectamente."
    },
    {
        id: "d-lineas-guia",
        category: "diseno",
        title: "Márgenes de seguridad internos",
        text: "Colocá guías a 2 o 3 cm del borde final. Nunca apoyes textos, teléfonos ni logos pegados al corte de la guillotina o al perímetro del bastidor."
    },
    {
        id: "d-sombras-naturales",
        category: "diseno",
        title: "Evitá sombras negras duras",
        text: "Las sombras paralelas al 100% de opacidad y negras puras se ven artificiales. Usá tonos oscuros del mismo fondo y desenfoques amplios y difusos."
    },
    {
        id: "d-perspectiva-mockup",
        category: "diseno",
        title: "Presentá siempre en fotomontaje",
        text: "El cliente no imagina cómo quedará el vinilo en su vidriera o vehículo. Montar el diseño sobre una foto real de su local evita discusiones previas."
    },
    {
        id: "d-versionado-ordenado",
        category: "diseno",
        title: "Versionado sin \"final_final\"",
        text: "Usá sufijos numéricos claros: _v1, _v2, _aprobado. El clásico \"final_listo_ahora_si.ai\" siempre termina provocando que se mande a imprimir la versión equivocada."
    },
    {
        id: "d-bloqueo-capas",
        category: "diseno",
        title: "Bloqueá capas de fondo",
        text: "Bloquear guías, cotas y fondos evita que se muevan por error milimétricamente al seleccionar elementos durante ajustes de último momento."
    },
    {
        id: "d-curvas-suaves",
        category: "diseno",
        title: "Simplificá nodos vectoriales",
        text: "Menos nodos en una curva bezier generan trazados más limpios y archivos livianos, además de evitar cortes temblorosos en plotters de corte."
    },
    {
        id: "d-isotipo-aislado",
        category: "diseno",
        title: "Isotipo independiente",
        text: "Cuando el espacio horizontal sea muy reducido (como un lomo de cartel o cenefa), utilizá solo el isotipo reconocido en lugar del imagotipo completo apretado."
    },
    {
        id: "d-fondos-contrastados",
        category: "diseno",
        title: "Fondo oscuro vs fondo claro",
        text: "El texto blanco sobre fondo oscuro se percibe visualmente más delgado que el mismo texto negro sobre fondo blanco. Considerá subirle un punto de peso."
    },
    {
        id: "d-coherencia-visual",
        category: "diseno",
        title: "Familia de piezas coherente",
        text: "Si el pedido incluye calcos, cartel exterior y banners roll-up, mantené las mismas tipografías, colores y estilos de fotografía en todas las piezas."
    },
    {
        id: "d-espacio-negativo",
        category: "diseno",
        title: "Aprovechá el espacio negativo",
        text: "El fondo que rodea a las formas puede dibujar siluetas inteligentes que aportan doble lectura y fijación de marca en la memoria del espectador."
    },
    {
        id: "d-prueba-escala-gris",
        category: "diseno",
        title: "Test en escala de grises",
        text: "Mirá tu diseño en blanco y negro: si los contrastes y jerarquías siguen funcionando sin el color, tu estructura de diseño es sólida y efectiva."
    },
    {
        id: "d-cuidado-detalles",
        category: "diseno",
        title: "Zoom al 100% antes de exportar",
        text: "Hacé zoom al 100% de visualización para chequear posibles líneas de píxeles huérfanas, máscaras mal cerradas o bordes mordidos en las fotos."
    },
    {
        id: "g-resolucion",
        category: "granformato",
        title: "En gran formato no hace falta 300 ppp",
        text: "A tamaño real, 100 a 150 ppp suele alcanzar para carteles que se ven a pocos metros; en gigantografías enormes, incluso menos. Lo que manda es la distancia desde la que se mira."
    },
    {
        id: "g-sangrado",
        category: "granformato",
        title: "Sangrado según el material",
        text: "Dejá sangrado en los bordes para evitar filos blancos al cortar. La medida depende del material y del acabado (lonas con dobladillo necesitan más): confirmala antes de diseñar."
    },
    {
        id: "g-curvas",
        category: "granformato",
        title: "Textos a curvas",
        text: "Convertí los textos a curvas o incrustá las fuentes antes de enviar el archivo, así no cambian por una fuente faltante en otra computadora."
    },
    {
        id: "g-negro",
        category: "granformato",
        title: "Negros que se ven negros",
        text: "En áreas grandes, un negro solo con K=100 puede verse algo gris. Un negro enriquecido (con algo de C, M y Y) suele verse más profundo: probalo en una muestra chica."
    },
    {
        id: "g-rgb-cmyk",
        category: "granformato",
        title: "La pantalla no imprime",
        text: "Los colores muy vivos en RGB (neones, azules eléctricos) se ven más apagados al pasarlos a tinta CMYK. Mostrá una prueba de color antes de la tirada completa."
    },
    {
        id: "g-distancia",
        category: "granformato",
        title: "Probá el cartel \"de lejos\"",
        text: "Achicá el diseño en pantalla hasta que sea del tamaño de un sello: si todavía se entiende el mensaje, va a funcionar a distancia."
    },
    {
        id: "g-baja-res",
        category: "granformato",
        title: "Cuando llega una foto chica",
        text: "Evitá estirar una imagen mucho más allá de 2× su tamaño original. Un escalador inteligente de imágenes está en el roadmap de Xana para ayudar con estos casos."
    },
    {
        id: "g-corte",
        category: "granformato",
        title: "Líneas de corte claras",
        text: "Para vinilo de corte o troquelado, dejá la línea de corte en una capa aparte y en un color directo (spot), sin relleno ni contorno extra que se imprima."
    },
    {
        id: "g-laminado",
        category: "granformato",
        title: "Laminado: protección extra",
        text: "Un laminado protege el impreso del roce y de la luz, y según el tipo (brillante, mate) cambia cómo se ven los colores. Elegilo pensando dónde va a vivir el cartel."
    },
    {
        id: "g-bolsillo-lona",
        category: "granformato",
        title: "Demasía para bolsillos de caño",
        text: "Si la lona lleva caño estructural de 1 pulgada, dejá al menos 8 a 10 cm de demasía perimetral para el termosoldado del bolsillo sin tapar textos."
    },
    {
        id: "g-ojales-distribucion",
        category: "granformato",
        title: "Área libre para ojalillos",
        text: "Los ojalillos metálicos se colocan habitualmente cada 25 a 50 cm. Mantené cualquier logo o dato a no menos de 5 cm del borde para evitar perforarlos."
    },
    {
        id: "g-microperforado",
        category: "granformato",
        title: "Vinilo microperforado para vidrios",
        text: "El vinilo microperforado permite ver hacia afuera desde adentro. Recordá que por la trama de agujeros pierde alrededor del 40% de contraste de color."
    },
    {
        id: "g-paneles-superposicion",
        category: "granformato",
        title: "Solape en paños grandes",
        text: "Cuando un cartel supere el ancho de bobina (ej. murales de vinilo), planificá un solape de 1.5 a 2 cm entre paños adyacentes para casar el dibujo perfectamente."
    },
    {
        id: "g-laminado-especial",
        category: "granformato",
        title: "Alerta de paños > 2.93 metros",
        text: "En el sistema LuXius, los paños con longitud mayor a 2.93 ml requieren laminado especial continuo. El sistema los resalta en color lila para planificar la mesa."
    },
    {
        id: "g-rotulacion-vehicular",
        category: "granformato",
        title: "Vinilo vehicular fundido vs monomérico",
        text: "Para curvas complejas y nervaduras de camionetas usá siempre vinilo fundido (cast). El vinilo monomérico encoge y se levanta en las molduras con el calor."
    },
    {
        id: "g-vinilo-transparente",
        category: "granformato",
        title: "Blanco sectorizado en cristal",
        text: "Al imprimir sobre vinilo transparente para vidrieras, los colores se ven translúcidos sin una capa de blanco de base (white ink o fondeado)."
    },
    {
        id: "g-escala-diez",
        category: "granformato",
        title: "Archivos en escala 1:10",
        text: "Si armás un cartel gigante en escala 1:10, asegurate de que las imágenes estén al menos a 1000 ppp para que al ampliar al 1000% en el RIP queden a 100 ppp reales."
    },
    {
        id: "g-orientacion-bobina",
        category: "granformato",
        title: "Optimización de bobina 1.52m vs 1.37m",
        text: "La bobina de 1.52m tiene un ancho útil de 1.515m. Rotar la pieza 90° si entra al través ahorra metros lineales significativos y reduce el costo de tirada."
    },
    {
        id: "g-tiempos-secado",
        category: "granformato",
        title: "Tiempo de curado solvente antes de laminar",
        text: "Nunca lamines vinilo recién salido del plotter eco-solvente. Dejalo desgasificar 12 a 24 horas; de lo contrario, los solventes atrapados generan burbujas."
    },
    {
        id: "g-lona-front-backlight",
        category: "granformato",
        title: "Diferencia Frontlight vs Backlight",
        text: "La lona Backlight para cajas de luz requiere mayor carga de tinta (doble pasada o perfil específico) para que los colores no se laven al encender la iluminación interior."
    },
    {
        id: "g-lona-blackout",
        category: "granformato",
        title: "Lona Blackout doble faz",
        text: "La lona blackout contiene una lámina interna oscura que impide el paso de la luz, haciéndola indispensable para carteles bifaces o fondos de prensa con flash."
    },
    {
        id: "g-overprint-trampas",
        category: "granformato",
        title: "Cuidado con la sobreimpresión",
        text: "Revisá que ningún elemento blanco tenga activada la opción \"Sobreimprimir relleno\" (Overprint), o desaparecerá por completo al procesarse en el RIP."
    },
    {
        id: "g-corte-contorno-bleed",
        category: "granformato",
        title: "Sangría en stickers y etiquetas",
        text: "Para calcos troquelados con plotter de corte óptico, extendé el fondo de color al menos 2 mm por fuera del vector de corte para evitar filos blancos por desvío."
    },
    {
        id: "g-espesores-soportes",
        category: "granformato",
        title: "Montaje sobre rígidos (Foam y PAI)",
        text: "Al laminar vinilo sobre PVC espumado, Polifán o Alto Impacto (PAI), limpiá previamente la superficie con alcohol isopropílico para retirar estática y polvo."
    },
    {
        id: "g-perfil-fogra",
        category: "granformato",
        title: "Perfil de color estándar Fogra 39",
        text: "Exportar en CMYK con espacio de trabajo ISO Coated v2 (ECI) o Coated FOGRA39 garantiza la mejor correspondencia de color al ripear en Roland VersaWorks."
    },
    {
        id: "g-lineas-muy-finas",
        category: "granformato",
        title: "Líneas finas mínimas imprimibles",
        text: "Evitá filetes menores a 0.5 puntos en gigantografía. En impresoras de inyección de gran formato, las líneas ultra finas pueden salir punteadas o romperse."
    },
    {
        id: "g-resolucion-cartel-ruta",
        category: "granformato",
        title: "Carteles de ruta a 40-50 ppp",
        text: "Un cartel de 8×3 metros ubicado al costado de la ruta se observa a más de 30 metros. Generar el archivo a más de 50 ppp solo satura la memoria del RIP sin beneficio visual."
    },
    {
        id: "g-degradados-vectores",
        category: "granformato",
        title: "Degradés complejos rasterizados",
        text: "Mallas de degradé muy complejas en Illustrator a veces se interpretan con artefactos en el RIP. Rasterizarlas a 150 ppp antes de enviar es una práctica preventiva sólida."
    },
    {
        id: "g-vinilo-esmerilado",
        category: "granformato",
        title: "Vinilo esmerilado para oficinas",
        text: "El vinilo arenado o esmerilado decorativo brinda privacidad sin quitar luz solar. Si lleva calados o logotipos, aplicá cinta de transferencia (posicionador) con buena adherencia."
    },
    {
        id: "g-posicionador-aplicacion",
        category: "granformato",
        title: "Cinta de aplicación (Papel vs Film)",
        text: "El papel posicionador permite colocaciones en húmedo con agua y jabón; el posicionador plástico transparente facilita el calce de piezas de varios colores en seco."
    },
    {
        id: "g-tensado-bastidores",
        category: "granformato",
        title: "Demasía para tensado en bastidor",
        text: "Si la lona va grampada detrás de un bastidor de caño estructural, agregá entre 12 y 15 cm por lado de imagen o color pleno para poder agarrar con la pinza de tensar."
    },
    {
        id: "g-temperatura-mesa",
        category: "granformato",
        title: "Calentador y mesa de secado del plotter",
        text: "Configurá la temperatura de secado (Print Heater y Dryer) según el grosor del vinilo. Si está muy caliente el material se ondula; si está frío, la tinta chorrea."
    },
    {
        id: "g-limpieza-rodillos",
        category: "granformato",
        title: "Limpieza de pinch rollers",
        text: "La suciedad o residuos de adhesivo en las rueditas de arrastre (pinch rollers) causan que el material avance torcido durante impresiones largas de varios metros."
    },
    {
        id: "g-marcas-corte-rip",
        category: "granformato",
        title: "Marcas de registro Roland VersaWorks",
        text: "Cuando vayas a imprimir y luego cortar (Print & Cut), dejá al menos 5 cm libres en el extremo inicial y final del material para que el sensor óptico lea las marcas."
    },
    {
        id: "g-archivos-tiffs-lzw",
        category: "granformato",
        title: "TIFF con compresión LZW",
        text: "Si exportás mapas de bits masivos para impresión, el formato TIFF con compresión LZW es sin pérdidas (lossless) y evita que los archivos pesen gigabytes innecesarios."
    },
    {
        id: "c-60-30-10",
        category: "color",
        title: "Regla 60-30-10",
        text: "Una paleta equilibrada suele repartir 60% color dominante, 30% secundario y 10% de acento. El acento es ideal para botones, precios o llamadas a la acción."
    },
    {
        id: "c-psicologia",
        category: "color",
        title: "Los colores comunican (con matices)",
        text: "El rojo transmite urgencia y energía, el azul confianza, el verde naturaleza y salud. Ojo: el significado cambia según el contexto y la cultura."
    },
    {
        id: "c-contraste",
        category: "color",
        title: "Contraste legible",
        text: "Para texto normal se recomienda una relación de contraste de al menos 4.5:1 entre texto y fondo. Chequealo con una herramienta antes de aprobar el diseño.",
        link: {
            label: "WebAIM Contrast Checker",
            url: "https://webaim.org/resources/contrastchecker/"
        }
    },
    {
        id: "c-script",
        category: "color",
        title: "Scripts: con medida",
        text: "Las tipografías cursivas decorativas pierden legibilidad en textos largos o en mayúsculas. Reservalas para títulos cortos."
    },
    {
        id: "c-interlineado",
        category: "color",
        title: "Interlineado cómodo",
        text: "Para texto corrido, un interlineado de alrededor de 120% a 150% del tamaño de la letra facilita la lectura. En títulos grandes se puede ajustar más."
    },
    {
        id: "c-licencia",
        category: "color",
        title: "Fuentes con licencia para uso comercial",
        text: "No todas las fuentes gratuitas se pueden usar en trabajos comerciales. Las de Google Fonts tienen licencias abiertas, una opción segura para empezar.",
        link: {
            label: "Google Fonts",
            url: "https://fonts.google.com"
        }
    },
    {
        id: "c-formula-negro-profundo",
        category: "color",
        title: "Fórmula de negro enriquecido para taller",
        text: "En impresión eco-solvente, una fórmula confiable para fondo negro parejo sin saturar la lona de tinta es: C=50, M=40, Y=40, K=100."
    },
    {
        id: "c-colores-pantone",
        category: "color",
        title: "Guías Pantone Solid to Process",
        text: "Los códigos Pantone no se imprimen directo a menos que uses tintas directas especiales. Cotejá siempre en una guía Color Bridge la simulación CMYK más cercana."
    },
    {
        id: "c-tracking-mayusculas",
        category: "color",
        title: "Tracking abierto en mayúsculas",
        text: "Cuando escribas títulos o palabras completamente en mayúsculas (versalitas o caja alta), abrí un poco el espaciado entre caracteres (tracking) para mejorar la lectura."
    },
    {
        id: "c-kerning-manual",
        category: "color",
        title: "Kerning manual en títulos y logotipos",
        text: "Los pares de letras como \"AV\", \"To\" o \"Wa\" suelen dejar huecos desproporcionados. Ajustá el interletrado manualmente en los textos destacados de tu marca."
    },
    {
        id: "c-serif-vs-sans",
        category: "color",
        title: "Tipografías con remates vs sin remates",
        text: "Las tipografías Sans Serif (sin remates) como Artegra o Helvetica ofrecen una lectura mucho más rápida y clara a la distancia en carteles y señalética."
    },
    {
        id: "c-armonia-complementarios",
        category: "color",
        title: "Colores complementarios opuestos",
        text: "Colores opuestos en la rueda cromática (como azul y naranja, o amarillo y violeta) generan el máximo contraste y vivacidad cuando se usan con moderación."
    },
    {
        id: "c-armonia-analoga",
        category: "color",
        title: "Paletas análogas para serenidad",
        text: "Elegir 3 colores vecinos en el círculo cromático (ej. verde esmeralda, verde lima y amarillo) crea una atmósfera armónica, serena y muy natural."
    },
    {
        id: "c-limite-cobertura-tinta",
        category: "color",
        title: "Cobertura total de tinta (TAC / TIC)",
        text: "Evitá que la suma de porcentajes CMYK supere el 280-300%. Si C+M+Y+K llega a 380%, la tinta chorrea, tarda días en secar y emborrona el material."
    },
    {
        id: "c-azul-vs-morado",
        category: "color",
        title: "El peligro del azul que sale violeta",
        text: "Un error clásico en impresión: si ponés C=100 y M=100, el azul saldrá morado. Para un azul marino o Francia vibrante, mantené el Magenta un 30% menor que el Cyan (ej. C=100, M=70)."
    },
    {
        id: "c-gris-neutro-cmyk",
        category: "color",
        title: "Grises neutros sin virado",
        text: "Para grises grandes en impresoras solventes, suele ser más seguro usar solo porcentajes de Negro (K) antes que una mezcla compuesta que pueda virar a verde o magenta."
    },
    {
        id: "c-tamano-optico",
        category: "color",
        title: "Cuerpo tipográfico y distancia",
        text: "Como regla práctica en carteles: 2.5 cm de altura de letra se leen cómodamente a 10 metros de distancia. Multiplicá por la distancia estimada del observador."
    },
    {
        id: "c-huérfanas-viudas",
        category: "color",
        title: "Líneas viudas y huérfanas",
        text: "Evitá que una sola palabra quede sola en el último renglón de un párrafo. Ajustá el ancho de la caja o recortá el texto para mantener bloques compactos."
    },
    {
        id: "c-alineacion-justificada",
        category: "color",
        title: "Cuidado con el texto justificado",
        text: "Justificar a ambos lados en columnas angostas genera \"ríos de espacio blanco\" entre palabras. Alinear a la izquierda con bandera suele ser mucho más legible."
    },
    {
        id: "c-variantes-peso",
        category: "color",
        title: "Aprovechá familias completas",
        text: "En lugar de mezclar muchas fuentes distintas, elegí una superfamilia que tenga variantes Thin, Regular, Medium, Bold y Black para resolver todos los niveles."
    },
    {
        id: "c-saturacion-luces",
        category: "color",
        title: "Saturación y percepción de luz",
        text: "Los colores muy saturados cansan la vista si se usan como fondo general. Reservalos para destacar mensajes clave y usá tonos desaturados de base."
    },
    {
        id: "c-temperatura-color",
        category: "color",
        title: "Temperatura cromática cálida vs fría",
        text: "Los tonos cálidos (amarillos, rojos) avanzan hacia el frente en la percepción humana, mientras que los tonos fríos (azules, grises) retroceden al fondo."
    },
    {
        id: "c-numeros-tabulares",
        category: "color",
        title: "Cifras tabulares para listas de precios",
        text: "En listas de precios o tablas, activá las cifras tabulares de la fuente tipográfica para que los números tengan el mismo ancho y queden perfectamente alineados en columna."
    },
    {
        id: "c-artegra-corporativa",
        category: "color",
        title: "Artegra Sans en LuXius",
        text: "En el sistema LuXius la tipografía corporativa oficial es Artegra Sans (Bold para títulos y SemiBold para datos clave), brindando fuerza y personalidad uniforme."
    },
    {
        id: "c-contraste-tonal",
        category: "color",
        title: "Contraste por luminosidad antes que por tono",
        text: "Dos colores de distinto tono (ej. verde y rojo) pero idéntico valor de brillo resultan ilegibles para personas con daltonismo. Asegurá siempre contraste de valor."
    },
    {
        id: "c-espacio-rgb-pantallas",
        category: "color",
        title: "Diseño para pantallas: sRGB vs P3",
        text: "Para imágenes destinadas a redes y web, convertí siempre al perfil sRGB IEC61966-2.1 para que se vean uniformes en cualquier celular o monitor común."
    },
    {
        id: "c-condensadas-ahorro",
        category: "color",
        title: "Fuentes condensadas para frentes anchos",
        text: "Para nombres de negocios muy largos en marquesinas estrechas, utilizá una fuente diseñada como Condensed nativa en lugar de aplastar artificialmente una fuente regular."
    },
    {
        id: "c-subrayado-obsoleto",
        category: "color",
        title: "El subrayado no es para destacar títulos",
        text: "Subrayar textos viene de la época de las máquinas de escribir y corta los trazos descendentes de letras como la p, q o j. Usá negrita o cambio de color."
    },
    {
        id: "c-tintas-metalicas",
        category: "color",
        title: "Simulación de dorados y plateados",
        text: "En impresión CMYK estándar no existen tintas oro directas; los dorados se simulan con gradientes de ocres, mostazas y amarillos con destellos estratégicos."
    },
    {
        id: "c-sensibilidad-cian",
        category: "color",
        title: "Sensibilidad visual al verde-cian",
        text: "El ojo humano tiene la mayor cantidad de conos sensibles en la franja del verde. Por eso detectamos pequeñísimas diferencias de tono en hojas y pastos impresos."
    },
    {
        id: "c-curvas-bezier-textos",
        category: "color",
        title: "No deformar texto en cajas estrechas",
        text: "Si el texto no entra, achicá el cuerpo o sintetizá las palabras. Forzar un ancho horizontal al 70% deforma las astas y arruina la belleza de la tipografía."
    },
    {
        id: "c-ligaduras-esteticas",
        category: "color",
        title: "Ligaduras OpenType discretas",
        text: "Las ligaduras tipográficas (como \"fi\" o \"fl\" unidas) resuelven colisiones de caracteres en textos formales. Desactivalas en cartelería si dificultan la lectura rápida."
    },
    {
        id: "s-coolors",
        category: "sitios",
        title: "Coolors: paletas en segundos",
        text: "Generá, ajustá y guardá paletas de colores; con la barra espaciadora probás combinaciones nuevas.",
        link: {
            label: "coolors.co",
            url: "https://coolors.co"
        }
    },
    {
        id: "s-adobecolor",
        category: "sitios",
        title: "Adobe Color",
        text: "Armá paletas con armonías (análogas, complementarias, triádicas) y extraé colores de una foto.",
        link: {
            label: "color.adobe.com",
            url: "https://color.adobe.com"
        }
    },
    {
        id: "s-typewolf",
        category: "sitios",
        title: "Typewolf: inspiración tipográfica",
        text: "Tendencias, combinaciones de fuentes y ejemplos reales para elegir tipografías con criterio.",
        link: {
            label: "typewolf.com",
            url: "https://www.typewolf.com"
        }
    },
    {
        id: "s-fontsinuse",
        category: "sitios",
        title: "Fonts In Use",
        text: "Archivo de proyectos reales con las fuentes usadas: ideal para ver cómo funciona una tipografía en un cartel, un envase o una revista.",
        link: {
            label: "fontsinuse.com",
            url: "https://fontsinuse.com"
        }
    },
    {
        id: "s-photopea",
        category: "sitios",
        title: "Photopea: editor en el navegador",
        text: "Un editor de imágenes online parecido a Photoshop que abre PSD, AI, PDF y más. Útil para un retoque rápido sin instalar nada.",
        link: {
            label: "photopea.com",
            url: "https://www.photopea.com"
        }
    },
    {
        id: "s-squoosh",
        category: "sitios",
        title: "Squoosh: comprimí imágenes",
        text: "Reducí el peso de una imagen para web comparando la calidad antes y después, directamente en el navegador.",
        link: {
            label: "squoosh.app",
            url: "https://squoosh.app"
        }
    },
    {
        id: "s-fotos",
        category: "sitios",
        title: "Fotos gratis de buena calidad",
        text: "Unsplash y Pexels ofrecen fotos de uso libre. Revisá siempre la licencia de cada imagen antes de usarla en un trabajo comercial.",
        link: {
            label: "unsplash.com",
            url: "https://unsplash.com"
        }
    },
    {
        id: "s-undraw",
        category: "sitios",
        title: "unDraw: ilustraciones editables",
        text: "Ilustraciones vectoriales gratuitas en las que podés cambiar el color principal para que combinen con tu marca.",
        link: {
            label: "undraw.co",
            url: "https://undraw.co"
        }
    },
    {
        id: "s-behance",
        category: "sitios",
        title: "Behance y Dribbble",
        text: "Portafolios de diseñadores de todo el mundo: una fuente inagotable de inspiración antes de arrancar un proyecto.",
        link: {
            label: "behance.net",
            url: "https://www.behance.net"
        }
    },
    {
        id: "s-lospec",
        category: "sitios",
        title: "Lospec: paletas pixel art",
        text: "Una enorme colección de paletas pensadas para pixel art, como el estilo del Print Den.",
        link: {
            label: "lospec.com/palette-list",
            url: "https://lospec.com/palette-list"
        }
    },
    {
        id: "s-kerning",
        category: "sitios",
        title: "The Kerning Game",
        text: "Un juego para entrenar el ojo ajustando el espacio entre letras. Practicá un rato y vas a notar la diferencia en tus logos.",
        link: {
            label: "type.method.ac",
            url: "https://type.method.ac"
        }
    },
    {
        id: "s-vectorizer",
        category: "sitios",
        title: "Vectorización con IA y trazados",
        text: "Herramientas como Vectorizer.ai convierten imágenes rasterizadas de baja calidad en vectores limpios SVG/EPS con gran fidelidad.",
        link: {
            label: "vectorizer.ai",
            url: "https://vectorizer.ai"
        }
    },
    {
        id: "s-ilovepdf",
        category: "sitios",
        title: "iLovePDF: navaja suiza de documentos",
        text: "Unir, dividir, comprimir y convertir documentos PDF directamente desde el navegador de manera ágil.",
        link: {
            label: "ilovepdf.com",
            url: "https://www.ilovepdf.com"
        }
    },
    {
        id: "s-brandfetch",
        category: "sitios",
        title: "Brandfetch: logos y assets de marcas",
        text: "Buscador instantáneo de logotipos vectoriales, tipografías y códigos de color oficiales de miles de marcas globales.",
        link: {
            label: "brandfetch.com",
            url: "https://brandfetch.com"
        }
    },
    {
        id: "s-worldvectorlogo",
        category: "sitios",
        title: "Worldvectorlogo",
        text: "Repositorio comunitario de logotipos en formato vectorial SVG listos para descargar cuando el cliente no tiene el archivo original.",
        link: {
            label: "worldvectorlogo.com",
            url: "https://worldvectorlogo.com"
        }
    },
    {
        id: "s-whatfont",
        category: "sitios",
        title: "WhatTheFont / MyFonts",
        text: "Subí una foto o captura de un cartel para identificar qué tipografía se utilizó mediante reconocimiento de caracteres.",
        link: {
            label: "myfonts.com/pages/whatthefont",
            url: "https://www.myfonts.com/pages/whatthefont"
        }
    },
    {
        id: "s-freepik",
        category: "sitios",
        title: "Freepik: vectores y mockups",
        text: "Banco gigante de vectores, plantillas de carteles y mockups fotográficos realistas para presentaciones comerciales.",
        link: {
            label: "freepik.es",
            url: "https://www.freepik.es"
        }
    },
    {
        id: "s-flaticon",
        category: "sitios",
        title: "Flaticon: íconos en SVG y PNG",
        text: "Millones de íconos vectoriales agrupados en packs con estilo uniforme para señalética, planos y cartelería informativa.",
        link: {
            label: "flaticon.es",
            url: "https://www.flaticon.es"
        }
    },
    {
        id: "s-fontspace",
        category: "sitios",
        title: "FontSpace: fuentes temáticas",
        text: "Miles de fuentes gratuitas ordenadas por temática (vintage, grafiti, cómic, retro) con filtros para uso comercial.",
        link: {
            label: "fontspace.com",
            url: "https://www.fontspace.com"
        }
    },
    {
        id: "s-dafont",
        category: "sitios",
        title: "DaFont: archivo histórico tipográfico",
        text: "El portal clásico para explorar fuentes tipográficas libres. Recordá siempre revisar si la licencia es 100% Free o Demo.",
        link: {
            label: "dafont.com",
            url: "https://www.dafont.com"
        }
    },
    {
        id: "s-mockupworld",
        category: "sitios",
        title: "Mockup World: maquetas gratuitas",
        text: "Directorio seleccionado de mockups limpios en formato PSD con objetos inteligentes para carteles, marquesinas y vehículos.",
        link: {
            label: "mockupworld.co",
            url: "https://www.mockupworld.co"
        }
    },
    {
        id: "s-removebg",
        category: "sitios",
        title: "Remove.bg: eliminación de fondos",
        text: "Elimina fondos de retratos o productos automáticamente en segundos con inteligencia artificial para bocetos rápidos.",
        link: {
            label: "remove.bg",
            url: "https://www.remove.bg"
        }
    },
    {
        id: "s-canva-color",
        category: "sitios",
        title: "Significado de los colores en Canva",
        text: "Guía exhaustiva con la historia, simbolismo y combinaciones ideales de cientos de nombres de colores específicos.",
        link: {
            label: "canva.com/colors",
            url: "https://www.canva.com/colors/"
        }
    },
    {
        id: "s-rawpixel",
        category: "sitios",
        title: "Rawpixel: arte de dominio público",
        text: "Ilustraciones botánicas, grabados antiguos y obras maestras del arte escaneadas en altísima resolución listas para imprimir.",
        link: {
            label: "rawpixel.com",
            url: "https://www.rawpixel.com"
        }
    },
    {
        id: "s-tinyjpg",
        category: "sitios",
        title: "TinyPNG / TinyJPG",
        text: "Compresión inteligente con pérdida imperceptible para enviar muestras previas por WhatsApp o mail sin saturar casillas.",
        link: {
            label: "tinypng.com",
            url: "https://tinypng.com"
        }
    },
    {
        id: "s-convertio",
        category: "sitios",
        title: "Convertio: conversor multi-formato",
        text: "Convierte archivos entre extensiones vectoriales y mapas de bits (CDR a AI, EPS a SVG, WEBP a JPG) en la nube.",
        link: {
            label: "convertio.co",
            url: "https://convertio.co"
        }
    },
    {
        id: "s-svgrepo",
        category: "sitios",
        title: "SVG Repo: vectores abiertos",
        text: "Más de 500.000 íconos y vectores en SVG libres de derechos y optimizados para proyectos de diseño.",
        link: {
            label: "svgrepo.com",
            url: "https://www.svgrepo.com"
        }
    },
    {
        id: "s-colorhunt",
        category: "sitios",
        title: "Color Hunt: paletas de tendencia",
        text: "Colección abierta de miles de paletas de 4 colores votadas por la comunidad creativa global para encontrar combinaciones frescas.",
        link: {
            label: "colorhunt.co",
            url: "https://colorhunt.co"
        }
    },
    {
        id: "s-blobmaker",
        category: "sitios",
        title: "Blobmaker: formas orgánicas",
        text: "Generador web de formas abstractas y orgánicas en SVG para fondos modernos de banners y carteles.",
        link: {
            label: "blobmaker.app",
            url: "https://www.blobmaker.app"
        }
    },
    {
        id: "s-fontpair",
        category: "sitios",
        title: "FontPair: maridaje tipográfico",
        text: "Ayuda a encontrar combinaciones perfectas de fuentes de Google Fonts (título Serif con cuerpo Sans Serif).",
        link: {
            label: "fontpair.co",
            url: "https://www.fontpair.co"
        }
    },
    {
        id: "t-illustrator",
        category: "tutoriales",
        title: "Adobe Illustrator: tutoriales oficiales",
        text: "Desde lo básico hasta técnicas avanzadas de vectores, directamente del fabricante.",
        link: {
            label: "Tutoriales de Illustrator",
            url: "https://helpx.adobe.com/illustrator/tutorials.html"
        }
    },
    {
        id: "t-photoshop",
        category: "tutoriales",
        title: "Photoshop: tutoriales oficiales",
        text: "Retoque, capas, máscaras y más, con ejercicios paso a paso.",
        link: {
            label: "Tutoriales de Photoshop",
            url: "https://helpx.adobe.com/photoshop/tutorials.html"
        }
    },
    {
        id: "t-inkscape",
        category: "tutoriales",
        title: "Inkscape: vectores gratis",
        text: "Una alternativa gratuita y de código abierto para ilustración vectorial, con tutoriales en su sitio oficial.",
        link: {
            label: "Tutoriales de Inkscape",
            url: "https://inkscape.org/learn/tutorials/"
        }
    },
    {
        id: "t-gimp",
        category: "tutoriales",
        title: "GIMP: edición de imágenes gratis",
        text: "Un editor de imágenes libre y potente. Su sitio reúne tutoriales para aprender desde cero.",
        link: {
            label: "Tutoriales de GIMP",
            url: "https://www.gimp.org/tutorials/"
        }
    },
    {
        id: "t-canva",
        category: "tutoriales",
        title: "Canva Design School",
        text: "Cursos y artículos cortos sobre fundamentos de diseño, color y composición, pensados para principiantes.",
        link: {
            label: "canva.com/designschool",
            url: "https://www.canva.com/designschool/"
        }
    },
    {
        id: "t-practical-typography",
        category: "tutoriales",
        title: "Practical Typography",
        text: "Un libro online gratuito con reglas claras de tipografía para que cualquier texto se vea profesional.",
        link: {
            label: "practicaltypography.com",
            url: "https://practicaltypography.com"
        }
    },
    {
        id: "t-coreldraw",
        category: "tutoriales",
        title: "CorelDRAW: tutoriales y trucos gráficos",
        text: "Guías oficiales para dominar CorelDRAW: gestión de curvas, encaje de objetos y preparación de archivos para corte e imprenta.",
        link: {
            label: "CorelDRAW Tutorials",
            url: "https://www.coreldraw.com/en/learn/tutorials/"
        }
    },
    {
        id: "t-versaworks",
        category: "tutoriales",
        title: "Roland VersaWorks: manuales y RIP",
        text: "Documentación oficial sobre calibración de avance (calibration feed), perfiles de sustrato y generación de canales de corte SpotColor.",
        link: {
            label: "Roland Academy",
            url: "https://www.rolanddga.com/support/roland-academy"
        }
    },
    {
        id: "t-affine-bezier",
        category: "tutoriales",
        title: "The Bézier Game: precisión de trazados",
        text: "Entrená el pulso para crear curvas de Bézier perfectas con el menor número de nodos posibles.",
        link: {
            label: "bezier.method.ac",
            url: "https://bezier.method.ac"
        }
    },
    {
        id: "t-color-method",
        category: "tutoriales",
        title: "Color: juego de precisión cromática",
        text: "Un test lúdico para afinar la vista detectando matices, saturaciones y colores complementarios contra reloj.",
        link: {
            label: "color.method.ac",
            url: "https://color.method.ac"
        }
    },
    {
        id: "t-taller-rotulacion",
        category: "tutoriales",
        title: "Técnicas de rotulación en seco y húmedo",
        text: "La colocación con espátula (squeegee) y fieltro en ángulo de 45° evita atrapamiento de aire en paños grandes de vinilo autoadhesivo."
    },
    {
        id: "t-calibracion-monitores",
        category: "tutoriales",
        title: "Calibración básica de monitor de diseño",
        text: "Ajustá el brillo de tu pantalla a unos 120 cd/m2. Un monitor calibrado con brillo excesivo hace que los impresos salgan mucho más oscuros de lo previsto."
    },
    {
        id: "t-termofijado-ojales",
        category: "tutoriales",
        title: "Soldado de lonas por cuña o aire caliente",
        text: "Mantener la pistola de calor (Leister) con avance parejo garantiza un dobladillo soldado sin quemar el PVC ni dejar zonas débiles."
    },
    {
        id: "t-vectorizacion-lineal",
        category: "tutoriales",
        title: "Vectorización manual con atajos",
        text: "El atajo Alt en Illustrator permite quebrar manecillas directrices de un punto ancla sin alterar la curva previa, logrando esquinas perfectas."
    },
    {
        id: "t-mascaras-recorte",
        category: "tutoriales",
        title: "Máscaras de recorte en vectores",
        text: "Para contener fotografías dentro de formas geométricas, usá Clipping Masks (Ctrl+7) en lugar de recortar los píxeles definitivamente."
    },
    {
        id: "t-ajuste-niveles-curvas",
        category: "tutoriales",
        title: "Niveles y Curvas para compensar fotos oscuras",
        text: "En Photoshop, una curva que aclare los medios tonos (gamma 1.1 a 1.2) compensa el oscurecimiento natural de la ganancia de punto en lonas."
    },
    {
        id: "t-paneles-rip-corte",
        category: "tutoriales",
        title: "Configuración de CutContour en Illustrator",
        text: "Creá una muestra de color nombrada exactamente \"CutContour\" como tinta plana (Spot Color) al 100% Magenta para que el RIP la reconozca como línea de corte."
    },
    {
        id: "t-montaje-bastidor",
        category: "tutoriales",
        title: "Técnica de engrampado en cruz",
        text: "Para que una lona quede como un tambor en un bastidor, empezá engrampando los centros de cada lado opuesto y avanzá hacia las esquinas estirando parejo."
    },
    {
        id: "t-perfil-icm",
        category: "tutoriales",
        title: "Gestión de perfiles ICC en el sistema",
        text: "Verificá que el RIP no re-convierta perfiles si el PDF ya viene cerrado en Fogra39, para evitar dobles conversiones cromáticas accidentales."
    },
    {
        id: "t-fuelle-marquesinas",
        category: "tutoriales",
        title: "Cálculo de cantos para marquesinas 3D",
        text: "En letras corpóreas o cajas luminosas, recordá sumar el espesor del canto (profundidad de 5 a 15 cm) al calcular el material requerido."
    },
    {
        id: "t-cuchillas-plotter",
        category: "tutoriales",
        title: "Ángulo de cuchillas de corte (45° vs 60°)",
        text: "Usá cuchillas de 45° para vinilos comunes y de 60° con punta fina para vinilos reflectivos gruesos, imantados o detalles tipográficos diminutos."
    },
    {
        id: "t-remocion-adhesivos",
        category: "tutoriales",
        title: "Limpieza de pegamento residual",
        text: "Para remover restos de vinilo viejo en vidrieras y chapas, el uso de calor suave con pistola y alcohol isopropílico o removedor cítrico protege la superficie base."
    },
    {
        id: "t-buscatrazos-pathfinder",
        category: "tutoriales",
        title: "Buscatrazos para plotters de corte",
        text: "Antes de mandar a cortar vinilo con letras superpuestas, aplicales \"Unificar\" en el Buscatrazos; de lo contrario, la cuchilla cortará las letras por dentro."
    },
    {
        id: "t-empaquetado-archivos",
        category: "tutoriales",
        title: "Empaquetar vínculos e imágenes en Illustrator",
        text: "Usá la función Archivo > Empaquetar para reunir todas las fuentes y fotos vinculadas en una sola carpeta antes de archivar o transferir la orden."
    },
    {
        id: "t-trazados-abiertos",
        category: "tutoriales",
        title: "Cerrar trazados para grabado y corte",
        text: "Un trazado abierto genera pausas y desajustes en máquinas láser y routers CNC. Verificá que cada polígono esté cerrado antes de exportar."
    },
    {
        id: "t-alineacion-optica-margen",
        category: "tutoriales",
        title: "Alineación óptica de signos y letras redondeadas",
        text: "Letras curvas como la \"O\" o \"C\" deben sobrepasar ligeramente la línea de base geométrica para percibirse del mismo tamaño que letras rectas como la \"H\"."
    },
    {
        id: "w-nombres",
        category: "taller",
        title: "Nombrá bien los archivos",
        text: "Un buen nombre ahorra mucho tiempo: número de OT, medidas y versión, por ejemplo OT-1234_120x80_v2.pdf. Así se encuentra al instante."
    },
    {
        id: "w-prueba",
        category: "taller",
        title: "Prueba de color antes de la tirada",
        text: "Imprimir una muestra chica antes del trabajo completo evita sorpresas con el color y ahorra material."
    },
    {
        id: "w-cabezales",
        category: "taller",
        title: "Antes de un trabajo largo",
        text: "Revisá el nivel de tinta y el estado de los cabezales antes de empezar una tirada grande. Un chequeo corto previene reimpresiones."
    },
    {
        id: "w-rollos",
        category: "taller",
        title: "Cuidá los rollos",
        text: "Guardá el vinilo y las lonas lejos del calor y de la humedad, y con el rollo bien sostenido para que no se deforme."
    },
    {
        id: "w-medidas",
        category: "taller",
        title: "Medí dos veces, imprimí una",
        text: "Confirmá las medidas finales con el pedido antes de enviar a imprimir: es el error más simple y el más caro de corregir."
    },
    {
        id: "w-pdfx",
        category: "taller",
        title: "PDF listo para imprimir",
        text: "Exportar en PDF con fuentes incrustadas y perfiles de color definidos (existen estándares como PDF/X pensados para impresión) reduce los cambios inesperados."
    },
    {
        id: "w-test-print",
        category: "taller",
        title: "Test print matutino indispensable",
        text: "Hacé siempre un test print de inyectores al encender la máquina. Limpiar una boquilla tapada a tiempo evita bandeo blanco en tiradas de 20 metros."
    },
    {
        id: "w-limpieza-wiper",
        category: "taller",
        title: "Mantenimiento semanal del wiper y capping",
        text: "Limpiá la gomita del wiper y el borde de las tapitas (capping) con líquido solvente original y hisopos de espuma sin pelusa para preservar los cabezales."
    },
    {
        id: "w-estatica-invierno",
        category: "taller",
        title: "Control de estática en días secos",
        text: "En invierno o días muy secos, la estática en el vinilo atrae polvo y desvía las microgotas de tinta. Mantené el taller humidificado y el plotter conectado a tierra."
    },
    {
        id: "w-nesting-skyline",
        category: "taller",
        title: "Aprovechamiento con Nesting Studio",
        text: "En el sistema LuXius podés anidar múltiples trabajos en Nesting Studio. Empaquetar piezas pequeñas junto a cortes largos ahorra hasta un 40% de consumo lineal."
    },
    {
        id: "w-calibracion-feed",
        category: "taller",
        title: "Calibración de avance según el sustrato",
        text: "Cada material tiene un peso y grosor distinto. Ajustá el feed calibration para cada rollo: si avanza de más genera rayas claras; si avanza de menos, rayas oscuras."
    },
    {
        id: "w-tension-bobina",
        category: "taller",
        title: "Nivelación y frenos del portarrollos",
        text: "Asegurate de que los conos del rollo trasero estén bien firmes y centrados. Un rollo desparejo genera arrugas y roces contra el carro de impresión."
    },
    {
        id: "w-refile-guillotina",
        category: "taller",
        title: "Cuchillas afiladas para refilar",
        text: "Cambiá periódicamente los filos del cutter o bisturí de refile. Un filo gastado muerde el vinilo y deshilacha el borde de las lonas."
    },
    {
        id: "w-temperatura-taller",
        category: "taller",
        title: "Temperatura ambiente ideal de 20° a 25°C",
        text: "Las tintas solventes cambian su viscosidad con el frío. Si el taller está por debajo de 18°C, las gotas no salen uniformes y los cabezales sufren."
    },
    {
        id: "w-cintas-doble-faz",
        category: "taller",
        title: "Cintas bifaz de alta adherencia (VHB)",
        text: "Para montar placas de polifán o chapas ligeras sin agujerear, usá cinta doble faz de espuma acrílica tipo VHB sobre superficies bien desengrasadas."
    },
    {
        id: "w-enrollado-graficas",
        category: "taller",
        title: "Enrollar siempre con la imagen hacia afuera",
        text: "Al guardar o entregar impresiones en vinilo o lona, enrollá con la tinta hacia afuera. Así el material no genera pliegues ni desprendimientos del liner."
    },
    {
        id: "w-control-stock-minimo",
        category: "taller",
        title: "Alertas de stock preventivo",
        text: "Chequeá el módulo de Stock de LuXius periódicamente. Quedarse sin bobina de 1.52m o sin botellas de tinta en medio de una entrega grande frena el taller."
    },
    {
        id: "w-etiquetas-produccion",
        category: "taller",
        title: "Etiqueta de producción en cada rollo",
        text: "Imprimí la etiqueta alargada de producción de LuXius y pegala en el rollo terminado: incluye cliente, medidas, miniaturas y fecha para despacho rápido."
    },
    {
        id: "w-limpieza-vidrios",
        category: "taller",
        title: "Desengrase total antes de rotular",
        text: "Para colocar vinilos en vidrios o autos, limpiá con agua y alcohol al 70%. Nunca uses limpiavidrios con siliconas porque impiden que el adhesivo pegue."
    },
    {
        id: "w-seguridad-ojos-manos",
        category: "taller",
        title: "Protección en el uso de solventes",
        text: "Usá guantes de nitrilo al manipular tintas eco-solventes o líquidos de flush. Protegé tu piel y ventilá el área de trabajo adecuadamente."
    },
    {
        id: "w-guardado-retazos",
        category: "taller",
        title: "Gestión inteligente de retazos",
        text: "Identificá y rotulá los sobrantes de bobina mayores a 1 metro con su ancho y material. Son ideales para muestras chicas y calcos sin abrir rollos nuevos."
    },
    {
        id: "w-orden-mesa-corte",
        category: "taller",
        title: "Mesa de trabajo libre de viruta",
        text: "Pasá un trapo antiestático por la mesa de corte antes de desplegar un impreso. Una partícula de metal o arena raya el laminado instantáneamente."
    },
    {
        id: "w-lamparas-inspeccion",
        category: "taller",
        title: "Luz neutra en la mesa de control",
        text: "Inspeccioná los trabajos terminados bajo tubos LED de luz día (5000K a 6500K) para verificar uniformidad de color antes de empaquetar para el cliente."
    },
    {
        id: "w-purga-tintas",
        category: "taller",
        title: "Evitá purgas excesivas",
        text: "Hacer muchas purgas de tinta seguidas desgasta los amortiguadores (dampers) y llena el botellón de desecho. Si persiste una boquilla tapada, hacé una limpieza suave."
    },
    {
        id: "w-cierre-caja-noche",
        category: "taller",
        title: "Rutina de apagado y guardado del plotter",
        text: "Nunca desconectes el plotter de la térmica si tiene sistema de autolimpieza nocturna. Dejalo en standby con las llaves de tinta abiertas y la tapa cerrada."
    },
    {
        id: "w-corte-inglete-marcos",
        category: "taller",
        title: "Ángulos a 45° en marcos de aluminio",
        text: "Al armar bastidores de perfilería para lonas tensadas, verificá la escuadra milimétrica en las 4 esquinas antes de atornillar las escuadras de refuerzo."
    },
    {
        id: "w-posicion-regla-corte",
        category: "taller",
        title: "Mano detrás de la guía de la regla",
        text: "Al cortar con cutter pesado y regla metálica con talón de seguridad, mantené los dedos firmes dentro del canal protector para prevenir accidentes."
    },
    {
        id: "w-cintas-embalaje",
        category: "taller",
        title: "Embalaje con film stretch protector",
        text: "Envolvé los rollos y lonas en film alveolar o stretch negro para envíos al interior. Los protege de la lluvia y roces durante el transporte en camión."
    },
    {
        id: "w-cambio-dampers",
        category: "taller",
        title: "Reemplazo preventivo de dampers",
        text: "Los filtros de los dampers se saturan con el tiempo. Cambiarlos una vez al año previene caídas repentinas de flujo de tinta en plenos extensos."
    },
    {
        id: "w-nivelacion-maquina",
        category: "taller",
        title: "Nivelación física de las patas del plotter",
        text: "Verificá con nivel de burbuja que el plotter esté completamente nivelado sobre el suelo del taller para que el material no deslice hacia un lateral."
    },
    {
        id: "w-resguardo-herramientas",
        category: "taller",
        title: "Cada herramienta en su panel",
        text: "Espátulas, cutters, tijeras, cintas y líquido limpiador deben volver a su puesto al terminar el día. Un taller ordenado produce el doble en menos tiempo."
    },
    {
        id: "w-control-tension-ojales",
        category: "taller",
        title: "Presión pareja en remachadora de ojalillos",
        text: "Ajustá el tope de la matriz de ojalillos para que prense firme sin morder ni rasgar la trama interna de poliéster de la lona."
    },
    {
        id: "w-doble-check-cliente",
        category: "taller",
        title: "Chequeo del remito contra la OT",
        text: "Antes de despachar o entregar en mostrador, verificá que la cantidad física de bultos y copias coincida con lo indicado en la orden del sistema LuXius."
    },
    {
        id: "w-ventilacion-secado",
        category: "taller",
        title: "Secado de impresos antes de doblar",
        text: "Nunca entregues una lona doblada si fue recién impresa. Si es indispensable plegarla, colocá papel intermedio para que no se pegue la tinta entre sí."
    },
    {
        id: "w-registro-calcos-plotter",
        category: "taller",
        title: "Luz ambiental suave para lectura de marcas",
        text: "Si el sensor óptico del plotter de corte no detecta las marcas de registro, apagá reflectores directos que den reflejos brillantes sobre el vinilo laminado."
    },
    {
        id: "q-fedex",
        category: "curiosidades",
        title: "La flecha escondida de FedEx",
        text: "En el logo de FedEx, el espacio negativo entre la \"E\" y la \"x\" forma una flecha. Un clásico del uso inteligente del espacio."
    },
    {
        id: "q-helvetica",
        category: "curiosidades",
        title: "Helvetica nació en 1957",
        text: "Fue diseñada por Max Miedinger y sigue siendo una de las tipografías más usadas del mundo en señalética y marcas."
    },
    {
        id: "q-comicsans",
        category: "curiosidades",
        title: "Comic Sans tiene origen concreto",
        text: "La diseñó Vincent Connare en 1994 para un asistente de Microsoft con globos de diálogo. Fue pensada para ese uso, no para carteles formales."
    },
    {
        id: "q-lorem",
        category: "curiosidades",
        title: "Lorem ipsum no es un invento moderno",
        text: "El famoso texto de relleno se basa en un pasaje de Cicerón de hace más de 2000 años, reordenado y adaptado."
    },
    {
        id: "q-punto",
        category: "curiosidades",
        title: "El punto tipográfico",
        text: "En el diseño digital, 1 punto equivale a 1/72 de pulgada. Por eso 72 pt miden aproximadamente 2,54 cm."
    },
    {
        id: "q-gutenberg",
        category: "curiosidades",
        title: "Cuando imprimir cambió el mundo",
        text: "Hacia 1450, Gutenberg desarrolló la imprenta de tipos móviles en Europa. Desde entonces, el oficio no paró de evolucionar: hoy imprimimos gigantografías."
    },
    {
        id: "q-origen-cmyk",
        category: "curiosidades",
        title: "Por qué la \"K\" en CMYK significa Negro",
        text: "La K proviene de \"Key\" (plancha clave o maestra). En la imprenta tradicional, la plancha negra era la que contenía las líneas principales de detalle y contraste."
    },
    {
        id: "q-logo-nike",
        category: "curiosidades",
        title: "El Swoosh de Nike costó 35 dólares",
        text: "Carolyn Davidson diseñó el logo de Nike en 1971 siendo estudiante universitaria por apenas 35 dólares. Años más tarde la empresa le reconoció acciones millonarias."
    },
    {
        id: "q-origen-pixel",
        category: "curiosidades",
        title: "De dónde viene la palabra \"Píxel\"",
        text: "Es un acrónimo creado en 1965 combinando \"Picture\" (abreviado coloquialmente como pix) y \"Element\" (el elemento más pequeño de una imagen digital)."
    },
    {
        id: "q-primer-cartel-publicitario",
        category: "curiosidades",
        title: "El nacimiento de la cartelería moderna",
        text: "Jules Chéret y Toulouse-Lautrec en París a fines del siglo XIX transformaron la litografía en color, convirtiendo las calles en museos de afiches al aire libre."
    },
    {
        id: "q-garamond-ahorro",
        category: "curiosidades",
        title: "Garamond y el ahorro de tinta",
        text: "Al tener trazos finos y gracias elegantes, Garamond consume hasta un 24% menos de tinta en documentos impresos comparada con fuentes como Arial o Times New Roman."
    },
    {
        id: "q-ampersand-origen",
        category: "curiosidades",
        title: "El origen del signo ampersand (&)",
        text: "El símbolo \"&\" nació como una ligadura de las letras romanas \"e\" y \"t\" que significan \"y\" en latín, manuscrito por los escribas de la antigüedad."
    },
    {
        id: "q-pantone-color-ano",
        category: "curiosidades",
        title: "El Color del Año de Pantone",
        text: "Desde el año 2000, el Pantone Color Institute reúne a expertos internacionales a puertas cerradas para definir el color que marcará la moda y el diseño del año siguiente."
    },
    {
        id: "q-primer-programa-diseno",
        category: "curiosidades",
        title: "Sketchpad: el abuelo de Illustrator",
        text: "Ivan Sutherland creó Sketchpad en 1963 en el MIT: fue el primer programa con interfaz gráfica y lápiz óptico que permitió manipular líneas vectoriales en pantalla."
    },
    {
        id: "q-proporcion-aurea",
        category: "curiosidades",
        title: "La divina proporción (Phi 1.618)",
        text: "El número áureo está presente en conchas marinas, girasoles y en logotipos célebres como el de Apple o Twitter, brindando una armonía geométrica innata."
    },
    {
        id: "q-corte-vinilo-signmaking",
        category: "curiosidades",
        title: "El primer plotter de corte de vinilo",
        text: "A principios de los años 80, la empresa Gerber Scientific presentó el primer plotter computarizado de corte con cuchilla giratoria, revolucionando la rotulación artesanal."
    },
    {
        id: "q-color-blanco-optico",
        category: "curiosidades",
        title: "Blanqueadores ópticos (OBA) en lonas",
        text: "Muchas lonas y papeles contienen aditivos fluorescentes que absorben luz ultravioleta invisible y emiten luz azulada para que el blanco parezca ultra brillante."
    },
    {
        id: "q-logo-chupa-chups-dali",
        category: "curiosidades",
        title: "Salvador Dalí diseñó el logo de Chupa Chups",
        text: "En 1969, el célebre pintor surrealista diseñó en una servilleta la margarita amarilla del logo y sugirió ubicarlo en la parte superior del caramelo para que no se deformara."
    },
    {
        id: "q-origen-dpi-ppp",
        category: "curiosidades",
        title: "Puntos por pulgada vs Píxeles por pulgada",
        text: "DPI (Dots Per Inch) mide los puntos físicos de tinta que escupe el cabezal del plotter; PPI (Pixels Per Inch) mide los píxeles digitales del archivo en pantalla."
    },
    {
        id: "q-cian-magenta-amarillo",
        category: "curiosidades",
        title: "Por qué síntesis sustractiva",
        text: "En CMYK los pigmentos absorben (sustraen) ciertas longitudes de onda de la luz blanca reflejada. La mezcla teórica de todos los colores da negro, al revés de las pantallas RGB."
    },
    {
        id: "q-formato-din-a4",
        category: "curiosidades",
        title: "La magia de la proporción 1:raíz de 2",
        text: "La serie de tamaños de papel DIN (A0, A1, A2, A3, A4) mantiene siempre la misma proporción matemática al doblarse por la mitad exacta."
    },
    {
        id: "q-carteleria-neon-vintage",
        category: "curiosidades",
        title: "El primer cartel de neón de la historia",
        text: "Georges Claude presentó el primer cartel luminoso con tubos de gas neón en el Salón del Automóvil de París en 1910, cambiando el paisaje nocturno de las ciudades."
    },
    {
        id: "q-origen-cmyk-halftone",
        category: "curiosidades",
        title: "La roseta de medio tono (Halftone)",
        text: "Al imprimir con tramas de puntos inclinados en ángulos específicos (C=15°, M=75°, Y=0°, K=45°), se forma un patrón de roseta invisible a simple vista que engaña al ojo."
    },
    {
        id: "q-primer-anuncio-carretera",
        category: "curiosidades",
        title: "Las vallas de ruta Burma-Shave",
        text: "En los años 20 en Estados Unidos, la crema de afeitar Burma-Shave instaló series de pequeños carteles rimados espaciados cada 100 metros que los conductores leían en fila."
    },
    {
        id: "q-historia-pantone",
        category: "curiosidades",
        title: "Pantone empezó como una imprenta comercial",
        text: "En los años 50 era una pequeña imprenta en New Jersey hasta que Lawrence Herbert sistematizó 10 pigmentos básicos creando la guía de igualación universal de color en 1963."
    },
    {
        id: "q-ojo-humano-megapixeles",
        category: "curiosidades",
        title: "La resolución del ojo humano",
        text: "Si nuestro ojo fuera una cámara fotográfica digital, su resolución efectiva en el centro del campo de visión (la fóvea) equivaldría a unos 576 megapíxeles."
    },
    {
        id: "q-signo-interrogacion",
        category: "curiosidades",
        title: "El origen del signo de pregunta (?)",
        text: "Proviene de la palabra latina \"Quaestio\" (pregunta). Los copistas medievales escribían una Q sobre una o para abreviar, que terminó derivando en el signo interrogativo actual."
    },
    {
        id: "x-presentacion",
        category: "xana",
        title: "Hola, soy Xana",
        text: "Estoy acá para acompañar al taller: cotizaciones, órdenes, stock y consejos de diseño. Si necesitás algo, usá mi asistente desde el panel."
    },
    {
        id: "x-tablon",
        category: "xana",
        title: "Este tablón es tuyo",
        text: "Guardá con la estrella ⭐ los consejos que más te sirvan. Se quedan guardados en este navegador y podés filtrarlos cuando quieras."
    },
    {
        id: "x-ideas",
        category: "xana",
        title: "¿Tenés un consejo o sitio para sumar?",
        text: "El equipo puede agregar consejos nuevos fácilmente en el archivo de contenido del tablón. Cuanto más útil sea, mejor para todos."
    },
    {
        id: "x-smart-order-drive",
        category: "xana",
        title: "Pegá enlaces de Google Drive directamente",
        text: "En Xana podés pegar un link público de Drive o WeTransfer con imágenes y el sistema extraerá las medidas, DPI, modo de color y cotizará el borrador automáticamente."
    },
    {
        id: "x-detector-escala",
        category: "xana",
        title: "Detector inteligente de escala 1:10",
        text: "Si un archivo mide 20 cm pero tiene 300 DPI y el nombre dice \"cartel\", Xana te sugerirá la escala 1:10 para cotizar el tamaño real de 2 metros."
    },
    {
        id: "x-detector-copias",
        category: "xana",
        title: "Detección automática de copias en el nombre",
        text: "Si el archivo se llama \"cartel_x_5_copias.jpg\", Xana detecta las 5 copias automáticamente y calcula el consumo lineal total sin que tengas que cargarlo a mano."
    },
    {
        id: "x-nesting-studio-ahorro",
        category: "xana",
        title: "Ahorro visual en Nesting Studio",
        text: "El motor de imposición 2D Skyline calcula en tiempo real cuántos metros lineales ahorrás colocando trabajos combinados en el mismo ancho de rollo."
    },
    {
        id: "x-xpress-viewer",
        category: "xana",
        title: "Xpress Viewer: revisión técnica en un clic",
        text: "Revisá la calidad física real, medí el DPI exacto a escala 1:1 y aprobá o rebotá la orden directo desde el visor sin abrir programas externos pesados."
    },
    {
        id: "x-simulador-virado",
        category: "xana",
        title: "Simulador de virado solvente en pantalla",
        text: "Activá el filtro de virado en Xpress Viewer para previsualizar cómo el soporte de vinilo y las tintas solventes afectarán los colores finales de la imagen."
    },
    {
        id: "x-calibrador-demasias",
        category: "xana",
        title: "Calibrador de demasías y guías perimetrales",
        text: "Configurá 2 cm para vinilo estándar o 10 cm para bolsillo de caño con presets rápidos y guardalo directamente en las especificaciones de la orden."
    },
    {
        id: "x-etiquetas-rollo-qr",
        category: "xana",
        title: "Etiquetas de rollo con medidas y miniaturas",
        text: "Hacé clic en el ícono de etiqueta en la orden para generar un PDF vertical de 105 mm listo para pegar a lo largo del rollo impreso."
    },
    {
        id: "x-descarga-masiva-zip",
        category: "xana",
        title: "Descarga en lote en un solo archivo ZIP",
        text: "Seleccioná varias órdenes de trabajo con el checkbox en Entrada y descargá todas las imágenes organizadas por carpeta con un solo clic."
    },
    {
        id: "x-tags-operativas",
        category: "xana",
        title: "Etiquetas operativas (Urgente, VIP, Muestra)",
        text: "Asigná etiquetas de color a las órdenes para priorizar en taller: URGENTE, REIMPRESIÓN, MUESTRA, VIP, ESPERA PAGO o STOCK."
    },
    {
        id: "x-sincronizacion-r2",
        category: "xana",
        title: "Almacenamiento ultra veloz en Cloudflare R2",
        text: "Todos los artes y documentos de LuXius se guardan cifrados en Cloudflare R2 con enlace seguro a Google Drive para respaldos nocturnos."
    },
    {
        id: "x-print-den-workshop",
        category: "xana",
        title: "El taller interactivo Print Den",
        text: "El panel interactivo en Pixel Art muestra el pulso del taller en tiempo real: máquinas activas, operarios en sus puestos y nuestro gato Frijol vigilando desde las alturas."
    },
    {
        id: "x-frijol-vigia",
        category: "xana",
        title: "Frijol: Vigía de las alturas inhóspitas",
        text: "Frijol trepa a las vigas metálicas del techo y observa todo el taller con tranquilidad. Si hacés clic en él mientras patrulla, te responderá con un maullido amistoso."
    },
    {
        id: "x-modo-pixel-art",
        category: "xana",
        title: "Modo Pixel Art y estética retro",
        text: "En el encabezado podés alternar el estilo del sistema entre la interfaz corporativa y el modo Pixel Art arcade para darle onda retro a tu jornada."
    },
    {
        id: "x-consultas-comandos",
        category: "xana",
        title: "Preguntale a Xana sobre el taller",
        text: "Podés consultarme: \"¿Qué órdenes urgentes hay hoy?\", \"¿Cuánto stock queda de vinilo brillante?\" o pedirme presupuestos exactos en lenguaje natural."
    },
    {
        id: "x-briefing-matutino",
        category: "xana",
        title: "Briefing matutino de producción",
        text: "Al arrancar la mañana, abrí el briefing de taller para ver el total de metros lineales encolados, órdenes prioritarias y novedades del día."
    },
    {
        id: "x-presupuestador-rapido",
        category: "xana",
        title: "Presupuestador con optimización de bobina",
        text: "Al ingresar ancho y alto, el calculador oficial de LuXius elige automáticamente la bobina comercial más eficiente minimizando el desperdicio."
    },
    {
        id: "x-seguimiento-diseno",
        category: "xana",
        title: "Seguimiento seguro de trabajos de diseño",
        text: "Cada diseñador puede seguir el estado de sus propios trabajos desde la pestaña de Diseño hasta que salen del taller refilados y listos para entrega."
    },
    {
        id: "x-telegram-bot",
        category: "xana",
        title: "Monitoreo remoto por Telegram",
        text: "Podés consultar la cola de taller y recibir alertas de stock crítico directamente en tu celular a través de nuestro bot oficial de Telegram."
    },
    {
        id: "x-futuro-jarvis",
        category: "xana",
        title: "Xana en continua evolución",
        text: "Día a día sigo aprendiendo para ser tu Jarvis de producción gráfica: más veloz, más precisa y siempre atenta a cada detalle del taller."
    }
];
