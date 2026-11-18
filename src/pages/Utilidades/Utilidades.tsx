
import { useMemo, useState } from 'react'
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
                description: "Tableros visuales, referencias gráficas y moodboards para diseño.",
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
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [query, setQuery] = useState('')

    const totalCount = useMemo(
        () => resources.reduce((sum, sec) => sum + sec.items.length, 0),
        []
    )

    const flatItems = useMemo(() => {
        const q = query.trim().toLowerCase()
        return resources.flatMap((section) =>
            section.items
                .filter(() => selectedCategory === 'all' || section.category === selectedCategory)
                .filter((item) => {
                    if (!q) return true
                    return (
                        item.title.toLowerCase().includes(q) ||
                        item.description.toLowerCase().includes(q) ||
                        section.category.toLowerCase().includes(q) ||
                        item.tags.some((t) => t.toLowerCase().includes(q))
                    )
                })
                .map((item) => ({ ...item, category: section.category }))
        )
    }, [selectedCategory, query])

    return (
        <div className="utilidades-page">
            <Header title="Utilidades" subtitle="Recursos y herramientas de diseño para el equipo" />

            <div className="utilidades-toolbar">
                <div className="utilidades-filters" role="group" aria-label="Filtrar recursos por categoría">
                    <button
                        type="button"
                        className={`util-filter-btn ${selectedCategory === 'all' ? 'is-active' : ''}`}
                        aria-pressed={selectedCategory === 'all'}
                        onClick={() => setSelectedCategory('all')}
                    >
                        Todas ({totalCount})
                    </button>
                    {resources.map((sec) => (
                        <button
                            key={sec.category}
                            type="button"
                            className={`util-filter-btn ${selectedCategory === sec.category ? 'is-active' : ''}`}
                            aria-pressed={selectedCategory === sec.category}
                            onClick={() => setSelectedCategory(sec.category)}
                        >
                            {sec.category} ({sec.items.length})
                        </button>
                    ))}
                </div>

                <input
                    type="search"
                    className="utilidades-search"
                    placeholder="Buscar recurso o etiqueta (ej. PDF, vector, fondo)..."
                    aria-label="Buscar recursos de diseño"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>

            {flatItems.length === 0 ? (
                <div className="utilidades-empty">
                    <p>No se encontraron recursos para "{query}".</p>
                    <button
                        type="button"
                        className="util-filter-btn is-active"
                        onClick={() => {
                            setQuery('')
                            setSelectedCategory('all')
                        }}
                    >
                        Limpiar filtros
                    </button>
                </div>
            ) : (
                <div className="resources-grid" role="list">
                    {flatItems.map((item) => (
                        <a
                            key={`${item.category}-${item.title}`}
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="resource-card"
                            role="listitem"
                        >
                            <div className="resource-header">
                                <div className="resource-icon" aria-hidden="true">{item.icon}</div>
                                <div className="resource-title-wrap">
                                    <h2 className="resource-title">{item.title}</h2>
                                    <span className="resource-category">{item.category}</span>
                                </div>
                                <span className="resource-ext" aria-hidden="true">↗</span>
                            </div>
                            <p className="resource-desc">{item.description}</p>
                            <div className="resource-tags">
                                {item.tags.map((tag) => (
                                    <span key={tag} className="resource-tag">{tag}</span>
                                ))}
                            </div>
                        </a>
                    ))}
                </div>
            )}
        </div>
    )
}
