
import Header from '@components/layout/Header'
import './Utilidades.css'

interface Resource {
    title: string
    description: string
    url: string
    icon: string
    tags: string[]
}

const resources: { category: string, items: Resource[] }[] = [
    {
        category: "Imágenes y Vectores",
        items: [
            {
                title: "Freepik",
                description: "Millones de recursos gráficos gratuitos: Vectores, fotos y más.",
                url: "https://www.freepik.es/",
                icon: "🎨",
                tags: ["Vectores", "Fotos", "PSD"]
            },
            {
                title: "Unsplash",
                description: "La fuente de imágenes de libre uso más generosa de internet.",
                url: "https://unsplash.com/es",
                icon: "📷",
                tags: ["Fotos HD", "Libre Uso"]
            },
            {
                title: "Pexels",
                description: "Las mejores fotos de stock gratis e imágenes libres de regalías.",
                url: "https://www.pexels.com/es-es/",
                icon: "🖼️",
                tags: ["Videos", "Fotos"]
            },
            {
                title: "Google Imágenes",
                description: "Búsqueda avanzada de imágenes en la web.",
                url: "https://images.google.com/",
                icon: "🔍",
                tags: ["Búsqueda"]
            },
            {
                title: "Brands of the World",
                description: "La mayor colección de logotipos vectoriales gratuitos del mundo.",
                url: "https://www.brandsoftheworld.com/",
                icon: "🌎",
                tags: ["Logos", "Vectores"]
            },
            {
                title: "SeekLogo",
                description: "Buscador de logotipos vectoriales y logotipos de marcas.",
                url: "https://seeklogo.com/",
                icon: "🎯",
                tags: ["Logos", "SVG/EPS"]
            }
        ]
    },
    {
        category: "Tipografía y Color",
        items: [
            {
                title: "DaFont",
                description: "Miles de fuentes gratuitas para descargar.",
                url: "https://www.dafont.com/es/",
                icon: "🅰️",
                tags: ["Fuentes", "Descarga"]
            },
            {
                title: "Google Fonts",
                description: "Fuentes web robustas y de código abierto.",
                url: "https://fonts.google.com/",
                icon: "🔤",
                tags: ["Web", "Diseño"]
            },
            {
                title: "Adobe Color",
                description: "Generador de paletas de colores y rueda cromática.",
                url: "https://color.adobe.com/es/create/color-wheel",
                icon: "🌈",
                tags: ["Paletas", "Color"]
            }
        ]
    },
    {
        category: "Herramientas Útiles",
        items: [
            {
                title: "Remove.bg",
                description: "Elimina fondos de imágenes automáticamente en 5 segundos.",
                url: "https://www.remove.bg/es",
                icon: "✂️",
                tags: ["Fondo", "AI"]
            },
            {
                title: "TinyPNG",
                description: "Compresión inteligente de imágenes WebP, PNG y JPEG.",
                url: "https://tinypng.com/",
                icon: "🐼",
                tags: ["Compresión", "Optimización"]
            },
            {
                title: "Convertio",
                description: "Conversor de archivos online (imágenes, documentos, audio).",
                url: "https://convertio.co/es/",
                icon: "🔄",
                tags: ["Convertidor", "Formatos"]
            },
            {
                title: "I Love PDF",
                description: "Herramientas online para unir, dividir y comprimir PDF.",
                url: "https://www.ilovepdf.com/es",
                icon: "📄",
                tags: ["PDF", "Edición"]
            }
        ]
    },
    {
        category: "Tratamiento de Imagen con IA",
        items: [
            {
                title: "Leonardo.ai",
                description: "Generación y edición avanzada de imágenes con IA.",
                url: "https://leonardo.ai/",
                icon: "🦁",
                tags: ["Generación", "Edición"]
            },
            {
                title: "Krea.ai",
                description: "Mejora y generación en tiempo real con IA.",
                url: "https://www.krea.ai/",
                icon: "⚡",
                tags: ["Mejora", "Realtime"]
            },
            {
                title: "Lexica",
                description: "Buscador de imágenes y modelos generados por IA.",
                url: "https://lexica.art/",
                icon: "🔮",
                tags: ["Prompt", "Buscador"]
            },
            {
                title: "Magnific AI",
                description: "Upscaler y potenciador de detalles premium.",
                url: "https://magnific.ai/",
                icon: "💎",
                tags: ["Upscale", "Detalle"]
            }
        ]
    },
    {
        category: "Inspiración",
        items: [
            {
                title: "Pinterest",
                description: "Descubre recetas, ideas para el hogar, estilo y más.",
                url: "https://www.pinterest.es/",
                icon: "📌",
                tags: ["Ideas", "Moodboard"]
            },
            {
                title: "Behance",
                description: "Muestra y descubre trabajos creativos.",
                url: "https://www.behance.net/",
                icon: "💡",
                tags: ["Portfolio", "Diseño"]
            }
        ]
    }
]

export default function Utilidades() {
    return (
        <div className="utilidades-page">
            <Header title="Utilidades" subtitle="Recursos y herramientas de diseño para el equipo" />

            {resources.map((section, idx) => (
                <section key={idx}>
                    <h2 className="section-title">{section.category}</h2>
                    <div className="resources-grid">
                        {section.items.map((item, i) => (
                            <a
                                key={i}
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="resource-card"
                            >
                                <div className="resource-header">
                                    <div className="resource-icon">{item.icon}</div>
                                    <h3 className="resource-title">{item.title}</h3>
                                </div>
                                <p className="resource-desc">{item.description}</p>
                                <div className="resource-tags">
                                    {item.tags.map(tag => (
                                        <span key={tag} className="resource-tag">{tag}</span>
                                    ))}
                                </div>
                            </a>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    )
}
