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
    /* ------------------------------ Diseño ------------------------------ */
    {
        id: 'd-jerarquia',
        category: 'diseno',
        title: 'Un solo protagonista',
        text: 'Si todo es grande y en negrita, nada se destaca. Armá 3 niveles (título, subtítulo y texto) y dejá que un solo elemento mande la mirada.'
    },
    {
        id: 'd-aire',
        category: 'diseno',
        title: 'El espacio en blanco también diseña',
        text: 'El aire alrededor de un elemento no es espacio perdido: le da importancia y descanso a la vista. Ante la duda, sacá un elemento en vez de agregar otro.'
    },
    {
        id: 'd-alineacion',
        category: 'diseno',
        title: 'Elegí una línea y respetala',
        text: 'Alinear todo a una misma línea (la izquierda suele ser la más legible) da orden inmediato. Evitá mezclar muchas alineaciones en el mismo diseño.'
    },
    {
        id: 'd-tercios',
        category: 'diseno',
        title: 'Regla de los tercios',
        text: 'Dividí la imagen en una grilla de 3×3 y poné el punto de interés sobre una intersección. Las composiciones centradas funcionan, pero las desplazadas suelen sentirse más dinámicas.'
    },
    {
        id: 'd-proporcion',
        category: 'diseno',
        title: 'Nunca estires un logo',
        text: 'Al redimensionar logos e imágenes mantené la proporción (en la mayoría de los programas, con Shift). Un logo deformado le resta seriedad a cualquier marca.'
    },
    {
        id: 'd-vectorial',
        category: 'diseno',
        title: 'Guardá siempre el original vectorial',
        text: 'Un logo en vector (AI, SVG, PDF) se puede ampliar sin perder calidad, desde una tarjeta hasta una fachada. Pedilo siempre y archivalo junto a la orden.'
    },
    {
        id: 'd-fuentes',
        category: 'diseno',
        title: 'Máximo dos familias tipográficas',
        text: 'Combinar más de dos fuentes suele ensuciar el diseño. Una opción segura: una familia para títulos y otra, más neutra, para el texto.'
    },

    /* ------------------------------ Gran formato ------------------------------ */
    {
        id: 'g-resolucion',
        category: 'granformato',
        title: 'En gran formato no hace falta 300 ppp',
        text: 'A tamaño real, 100 a 150 ppp suele alcanzar para carteles que se ven a pocos metros; en gigantografías enormes, incluso menos. Lo que manda es la distancia desde la que se mira.'
    },
    {
        id: 'g-sangrado',
        category: 'granformato',
        title: 'Sangrado según el material',
        text: 'Dejá sangrado en los bordes para evitar filos blancos al cortar. La medida depende del material y del acabado (lonas con dobladillo necesitan más): confirmala antes de diseñar.'
    },
    {
        id: 'g-curvas',
        category: 'granformato',
        title: 'Textos a curvas',
        text: 'Convertí los textos a curvas o incrustá las fuentes antes de enviar el archivo, así no cambian por una fuente faltante en otra computadora.'
    },
    {
        id: 'g-negro',
        category: 'granformato',
        title: 'Negros que se ven negros',
        text: 'En áreas grandes, un negro solo con K=100 puede verse algo gris. Un negro enriquecido (con algo de C, M y Y) suele verse más profundo: probalo en una muestra chica.'
    },
    {
        id: 'g-rgb-cmyk',
        category: 'granformato',
        title: 'La pantalla no imprime',
        text: 'Los colores muy vivos en RGB (neones, azules eléctricos) se ven más apagados al pasarlos a tinta CMYK. Mostrá una prueba de color antes de la tirada completa.'
    },
    {
        id: 'g-distancia',
        category: 'granformato',
        title: 'Probá el cartel "de lejos"',
        text: 'Achicá el diseño en pantalla hasta que sea del tamaño de un sello: si todavía se entiende el mensaje, va a funcionar a distancia.'
    },
    {
        id: 'g-baja-res',
        category: 'granformato',
        title: 'Cuando llega una foto chica',
        text: 'Evitá estirar una imagen mucho más allá de 2× su tamaño original. Un escalador inteligente de imágenes está en el roadmap de Xana para ayudar con estos casos.'
    },
    {
        id: 'g-corte',
        category: 'granformato',
        title: 'Líneas de corte claras',
        text: 'Para vinilo de corte o troquelado, dejá la línea de corte en una capa aparte y en un color directo (spot), sin relleno ni contorno extra que se imprima.'
    },
    {
        id: 'g-laminado',
        category: 'granformato',
        title: 'Laminado: protección extra',
        text: 'Un laminado protege el impreso del roce y de la luz, y según el tipo (brillante, mate) cambia cómo se ven los colores. Elegilo pensando dónde va a vivir el cartel.'
    },

    /* ------------------------------ Color y tipografía ------------------------------ */
    {
        id: 'c-60-30-10',
        category: 'color',
        title: 'Regla 60-30-10',
        text: 'Una paleta equilibrada suele repartir 60% color dominante, 30% secundario y 10% de acento. El acento es ideal para botones, precios o llamadas a la acción.'
    },
    {
        id: 'c-psicologia',
        category: 'color',
        title: 'Los colores comunican (con matices)',
        text: 'El rojo transmite urgencia y energía, el azul confianza, el verde naturaleza y salud. Ojo: el significado cambia según el contexto y la cultura.'
    },
    {
        id: 'c-contraste',
        category: 'color',
        title: 'Contraste legible',
        text: 'Para texto normal se recomienda una relación de contraste de al menos 4.5:1 entre texto y fondo. Chequealo con una herramienta antes de aprobar el diseño.',
        link: { label: 'WebAIM Contrast Checker', url: 'https://webaim.org/resources/contrastchecker/' }
    },
    {
        id: 'c-script',
        category: 'color',
        title: 'Scripts: con medida',
        text: 'Las tipografías cursivas decorativas pierden legibilidad en textos largos o en mayúsculas. Reservalas para títulos cortos.'
    },
    {
        id: 'c-interlineado',
        category: 'color',
        title: 'Interlineado cómodo',
        text: 'Para texto corrido, un interlineado de alrededor de 120% a 150% del tamaño de la letra facilita la lectura. En títulos grandes se puede ajustar más.'
    },
    {
        id: 'c-licencia',
        category: 'color',
        title: 'Fuentes con licencia para uso comercial',
        text: 'No todas las fuentes gratuitas se pueden usar en trabajos comerciales. Las de Google Fonts tienen licencias abiertas, una opción segura para empezar.',
        link: { label: 'Google Fonts', url: 'https://fonts.google.com' }
    },

    /* ------------------------------ Sitios útiles ------------------------------ */
    {
        id: 's-coolors',
        category: 'sitios',
        title: 'Coolors: paletas en segundos',
        text: 'Generá, ajustá y guardá paletas de colores; con la barra espaciadora probás combinaciones nuevas.',
        link: { label: 'coolors.co', url: 'https://coolors.co' }
    },
    {
        id: 's-adobecolor',
        category: 'sitios',
        title: 'Adobe Color',
        text: 'Armá paletas con armonías (análogas, complementarias, triádicas) y extraé colores de una foto.',
        link: { label: 'color.adobe.com', url: 'https://color.adobe.com' }
    },
    {
        id: 's-typewolf',
        category: 'sitios',
        title: 'Typewolf: inspiración tipográfica',
        text: 'Tendencias, combinaciones de fuentes y ejemplos reales para elegir tipografías con criterio.',
        link: { label: 'typewolf.com', url: 'https://www.typewolf.com' }
    },
    {
        id: 's-fontsinuse',
        category: 'sitios',
        title: 'Fonts In Use',
        text: 'Archivo de proyectos reales con las fuentes usadas: ideal para ver cómo funciona una tipografía en un cartel, un envase o una revista.',
        link: { label: 'fontsinuse.com', url: 'https://fontsinuse.com' }
    },
    {
        id: 's-photopea',
        category: 'sitios',
        title: 'Photopea: editor en el navegador',
        text: 'Un editor de imágenes online parecido a Photoshop que abre PSD, AI, PDF y más. Útil para un retoque rápido sin instalar nada.',
        link: { label: 'photopea.com', url: 'https://www.photopea.com' }
    },
    {
        id: 's-squoosh',
        category: 'sitios',
        title: 'Squoosh: comprimí imágenes',
        text: 'Reducí el peso de una imagen para web comparando la calidad antes y después, directamente en el navegador.',
        link: { label: 'squoosh.app', url: 'https://squoosh.app' }
    },
    {
        id: 's-fotos',
        category: 'sitios',
        title: 'Fotos gratis de buena calidad',
        text: 'Unsplash y Pexels ofrecen fotos de uso libre. Revisá siempre la licencia de cada imagen antes de usarla en un trabajo comercial.',
        link: { label: 'unsplash.com', url: 'https://unsplash.com' }
    },
    {
        id: 's-undraw',
        category: 'sitios',
        title: 'unDraw: ilustraciones editables',
        text: 'Ilustraciones vectoriales gratuitas en las que podés cambiar el color principal para que combinen con tu marca.',
        link: { label: 'undraw.co', url: 'https://undraw.co' }
    },
    {
        id: 's-behance',
        category: 'sitios',
        title: 'Behance y Dribbble',
        text: 'Portafolios de diseñadores de todo el mundo: una fuente inagotable de inspiración antes de arrancar un proyecto.',
        link: { label: 'behance.net', url: 'https://www.behance.net' }
    },
    {
        id: 's-lospec',
        category: 'sitios',
        title: 'Lospec: paletas pixel art',
        text: 'Una enorme colección de paletas pensadas para pixel art, como el estilo del Print Den.',
        link: { label: 'lospec.com/palette-list', url: 'https://lospec.com/palette-list' }
    },
    {
        id: 's-kerning',
        category: 'sitios',
        title: 'The Kerning Game',
        text: 'Un juego para entrenar el ojo ajustando el espacio entre letras. Practicá un rato y vas a notar la diferencia en tus logos.',
        link: { label: 'type.method.ac', url: 'https://type.method.ac' }
    },

    /* ------------------------------ Tutoriales ------------------------------ */
    {
        id: 't-illustrator',
        category: 'tutoriales',
        title: 'Adobe Illustrator: tutoriales oficiales',
        text: 'Desde lo básico hasta técnicas avanzadas de vectores, directamente del fabricante.',
        link: { label: 'Tutoriales de Illustrator', url: 'https://helpx.adobe.com/illustrator/tutorials.html' }
    },
    {
        id: 't-photoshop',
        category: 'tutoriales',
        title: 'Photoshop: tutoriales oficiales',
        text: 'Retoque, capas, máscaras y más, con ejercicios paso a paso.',
        link: { label: 'Tutoriales de Photoshop', url: 'https://helpx.adobe.com/photoshop/tutorials.html' }
    },
    {
        id: 't-inkscape',
        category: 'tutoriales',
        title: 'Inkscape: vectores gratis',
        text: 'Una alternativa gratuita y de código abierto para ilustración vectorial, con tutoriales en su sitio oficial.',
        link: { label: 'Tutoriales de Inkscape', url: 'https://inkscape.org/learn/tutorials/' }
    },
    {
        id: 't-gimp',
        category: 'tutoriales',
        title: 'GIMP: edición de imágenes gratis',
        text: 'Un editor de imágenes libre y potente. Su sitio reúne tutoriales para aprender desde cero.',
        link: { label: 'Tutoriales de GIMP', url: 'https://www.gimp.org/tutorials/' }
    },
    {
        id: 't-canva',
        category: 'tutoriales',
        title: 'Canva Design School',
        text: 'Cursos y artículos cortos sobre fundamentos de diseño, color y composición, pensados para principiantes.',
        link: { label: 'canva.com/designschool', url: 'https://www.canva.com/designschool/' }
    },
    {
        id: 't-practical-typography',
        category: 'tutoriales',
        title: 'Practical Typography',
        text: 'Un libro online gratuito con reglas claras de tipografía para que cualquier texto se vea profesional.',
        link: { label: 'practicaltypography.com', url: 'https://practicaltypography.com' }
    },

    /* ------------------------------ Taller ------------------------------ */
    {
        id: 'w-nombres',
        category: 'taller',
        title: 'Nombrá bien los archivos',
        text: 'Un buen nombre ahorra mucho tiempo: número de OT, medidas y versión, por ejemplo OT-1234_120x80_v2.pdf. Así se encuentra al instante.'
    },
    {
        id: 'w-prueba',
        category: 'taller',
        title: 'Prueba de color antes de la tirada',
        text: 'Imprimir una muestra chica antes del trabajo completo evita sorpresas con el color y ahorra material.'
    },
    {
        id: 'w-cabezales',
        category: 'taller',
        title: 'Antes de un trabajo largo',
        text: 'Revisá el nivel de tinta y el estado de los cabezales antes de empezar una tirada grande. Un chequeo corto previene reimpresiones.'
    },
    {
        id: 'w-rollos',
        category: 'taller',
        title: 'Cuidá los rollos',
        text: 'Guardá el vinilo y las lonas lejos del calor y de la humedad, y con el rollo bien sostenido para que no se deforme.'
    },
    {
        id: 'w-medidas',
        category: 'taller',
        title: 'Medí dos veces, imprimí una',
        text: 'Confirmá las medidas finales con el pedido antes de enviar a imprimir: es el error más simple y el más caro de corregir.'
    },
    {
        id: 'w-pdfx',
        category: 'taller',
        title: 'PDF listo para imprimir',
        text: 'Exportar en PDF con fuentes incrustadas y perfiles de color definidos (existen estándares como PDF/X pensados para impresión) reduce los cambios inesperados.'
    },

    /* ------------------------------ Curiosidades ------------------------------ */
    {
        id: 'q-fedex',
        category: 'curiosidades',
        title: 'La flecha escondida de FedEx',
        text: 'En el logo de FedEx, el espacio negativo entre la "E" y la "x" forma una flecha. Un clásico del uso inteligente del espacio.'
    },
    {
        id: 'q-helvetica',
        category: 'curiosidades',
        title: 'Helvetica nació en 1957',
        text: 'Fue diseñada por Max Miedinger y sigue siendo una de las tipografías más usadas del mundo en señalética y marcas.'
    },
    {
        id: 'q-comicsans',
        category: 'curiosidades',
        title: 'Comic Sans tiene origen concreto',
        text: 'La diseñó Vincent Connare en 1994 para un asistente de Microsoft con globos de diálogo. Fue pensada para ese uso, no para carteles formales.'
    },
    {
        id: 'q-lorem',
        category: 'curiosidades',
        title: 'Lorem ipsum no es un invento moderno',
        text: 'El famoso texto de relleno se basa en un pasaje de Cicerón de hace más de 2000 años, reordenado y adaptado.'
    },
    {
        id: 'q-punto',
        category: 'curiosidades',
        title: 'El punto tipográfico',
        text: 'En el diseño digital, 1 punto equivale a 1/72 de pulgada. Por eso 72 pt miden aproximadamente 2,54 cm.'
    },
    {
        id: 'q-gutenberg',
        category: 'curiosidades',
        title: 'Cuando imprimir cambió el mundo',
        text: 'Hacia 1450, Gutenberg desarrolló la imprenta de tipos móviles en Europa. Desde entonces, el oficio no paró de evolucionar: hoy imprimimos gigantografías.'
    },

    /* ------------------------------ Xana ------------------------------ */
    {
        id: 'x-presentacion',
        category: 'xana',
        title: 'Hola, soy Xana',
        text: 'Estoy acá para acompañar al taller: cotizaciones, órdenes, stock y consejos de diseño. Si necesitás algo, usá mi asistente desde el panel.'
    },
    {
        id: 'x-tablon',
        category: 'xana',
        title: 'Este tablón es tuyo',
        text: 'Guardá con la estrella ⭐ los consejos que más te sirvan. Se quedan guardados en este navegador y podés filtrarlos cuando quieras.'
    },
    {
        id: 'x-ideas',
        category: 'xana',
        title: '¿Tenés un consejo o sitio para sumar?',
        text: 'El equipo puede agregar consejos nuevos fácilmente en el archivo de contenido del tablón. Cuanto más útil sea, mejor para todos.'
    }
];
