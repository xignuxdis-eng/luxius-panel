import { useState, useEffect } from "react";
import { 
  Cloud, 
  Sun, 
  CloudRain, 
  CloudSnow, 
  Wind, 
  MapPin,
  Settings,
  X,
  Search
} from "lucide-react";

interface WeatherData {
  temperature: number;
  description: string;
  humidity: number;
  windSpeed: number;
  icon: string;
}

interface Location {
  name: string;
  lat: number;
  lon: number;
  timezone: string;
}

export default function WeatherTimeWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Ubicación por defecto (Buenos Aires)
  const [currentLocation, setCurrentLocation] = useState<Location>({
    name: "Buenos Aires, Argentina",
    lat: -34.6118,
    lon: -58.3960,
    timezone: "America/Argentina/Buenos_Aires"
  });

  // Actualizar tiempo cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Cargar clima y hora
  useEffect(() => {
    fetchWeatherData();
  }, [currentLocation]);

  const fetchWeatherData = async () => {
    setIsLoading(true);
    
    try {
      const apiKey = (import.meta as any).env?.VITE_OPENWEATHER_API_KEY;
      
      if (apiKey) {
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${currentLocation.lat}&lon=${currentLocation.lon}&appid=${apiKey}&units=metric&lang=es`
        );
        
        if (response.ok) {
          const data = await response.json();
          setWeather({
            temperature: Math.round(data.main.temp),
            description: data.weather[0].description,
            humidity: data.main.humidity,
            windSpeed: Math.round(data.wind.speed * 3.6), // Convertir m/s a km/h
            icon: data.weather[0].main.toLowerCase()
          });
        } else {
          // Usar datos mock si la API falla
          setWeather(getMockWeatherData());
        }
      } else {
        // Usar datos mock si no hay API key
        setWeather(getMockWeatherData());
      }
    } catch (error) {
      console.error("Error fetching weather:", error);
      setWeather(getMockWeatherData());
    } finally {
      setIsLoading(false);
    }
  };

  const getMockWeatherData = (): WeatherData => {
    const mockData = [
      { temperature: 22, description: "Soleado", humidity: 65, windSpeed: 12, icon: "sun" },
      { temperature: 18, description: "Nublado", humidity: 75, windSpeed: 8, icon: "cloud" },
      { temperature: 15, description: "Lluvioso", humidity: 85, windSpeed: 15, icon: "rain" },
      { temperature: 25, description: "Parcialmente nublado", humidity: 60, windSpeed: 10, icon: "cloud" }
    ];
    return mockData[Math.floor(Math.random() * mockData.length)];
  };

  const getWeatherIcon = (icon: string) => {
    switch (icon) {
      case 'clear':
      case 'sun':
        return <Sun className="w-4 h-4 text-yellow-500" />;
      case 'clouds':
      case 'cloud':
        return <Cloud className="w-4 h-4 text-gray-500" />;
      case 'rain':
      case 'drizzle':
        return <CloudRain className="w-4 h-4 text-blue-500" />;
      case 'snow':
        return <CloudSnow className="w-4 h-4 text-blue-300" />;
      default:
        return <Cloud className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: currentLocation.timezone
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-AR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: currentLocation.timezone
    });
  };

  const searchLocations = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const apiKey = (import.meta as any).env?.VITE_OPENWEATHER_API_KEY;
      
      if (apiKey) {
        const response = await fetch(
          `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${apiKey}`
        );
        
        if (response.ok) {
          const data = await response.json();
          const locations: Location[] = data.map((item: any) => ({
            name: `${item.name}, ${item.country}`,
            lat: item.lat,
            lon: item.lon,
            timezone: `UTC${item.lat > 0 ? '+' : ''}${Math.round(item.lon / 15)}`
          }));
          setSearchResults(locations);
        }
      } else {
        // Mock locations para testing
        const mockLocations: Location[] = [
          { name: "Buenos Aires, Argentina", lat: -34.6118, lon: -58.3960, timezone: "America/Argentina/Buenos_Aires" },
          { name: "Córdoba, Argentina", lat: -31.4201, lon: -64.1888, timezone: "America/Argentina/Cordoba" },
          { name: "Rosario, Argentina", lat: -32.9468, lon: -60.6393, timezone: "America/Argentina/Buenos_Aires" },
          { name: "Mendoza, Argentina", lat: -32.8908, lon: -68.8272, timezone: "America/Argentina/Mendoza" },
          { name: "La Plata, Argentina", lat: -34.9205, lon: -57.9536, timezone: "America/Argentina/Buenos_Aires" }
        ].filter(loc => 
          loc.name.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(mockLocations);
      }
    } catch (error) {
      console.error("Error searching locations:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLocationSelect = (location: Location) => {
    setCurrentLocation(location);
    setShowLocationModal(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchLocations(query);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-200 min-w-[240px] max-w-[280px]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Cloud className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Clima y Hora</span>
          </div>
          <button
            onClick={() => setShowLocationModal(true)}
            className="hover:bg-gray-100 p-1 rounded"
            title="Cambiar ubicación"
          >
            <Settings className="w-3 h-3 text-gray-500" />
          </button>
        </div>
        <div className="text-center py-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-200 min-w-[240px] max-w-[280px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-600">Clima y Hora</span>
          </div>
          <button
            onClick={() => setShowLocationModal(true)}
            className="hover:bg-gray-100 p-1 rounded"
            title="Cambiar ubicación"
          >
            <Settings className="w-3 h-3 text-gray-500" />
          </button>
        </div>

        {/* Location */}
        <div className="text-xs text-gray-500 mb-2 truncate">
          {currentLocation.name}
        </div>

        {/* Time */}
        <div className="text-lg font-semibold text-gray-800 mb-2">
          {formatTime(currentTime)}
        </div>
        <div className="text-xs text-gray-500 mb-3">
          {formatDate(currentTime)}
        </div>

        {/* Weather */}
        {weather && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getWeatherIcon(weather.icon)}
                <span className="text-sm font-medium text-gray-700">
                  {weather.temperature}°C
                </span>
              </div>
              <span className="text-xs text-gray-500 capitalize">
                {weather.description}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>💧 {weather.humidity}%</span>
              <span>💨 {weather.windSpeed} km/h</span>
            </div>
          </div>
        )}
      </div>

      {/* Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-[90vw]">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Cambiar Ubicación
              </h3>
              <button
                onClick={() => setShowLocationModal(false)}
                className="hover:bg-gray-100 p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Buscar ciudad..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Current Location */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Ubicación Actual:</h4>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-800">{currentLocation.name}</span>
                </div>
              </div>
            </div>

            {/* Search Results */}
            {searchQuery.length >= 3 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Resultados:
                </h4>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {isSearching ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-xs text-gray-500 mt-2">Buscando...</p>
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((location, index) => (
                      <button
                        key={index}
                        onClick={() => handleLocationSelect(location)}
                        className="w-full text-left p-2 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-700">{location.name}</span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-xs text-gray-500">No se encontraron resultados</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Popular Cities */}
            {searchQuery.length < 3 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Ciudades Populares:
                </h4>
                <div className="grid grid-cols-1 gap-1">
                  {[
                    { name: "Buenos Aires, Argentina", lat: -34.6118, lon: -58.3960, timezone: "America/Argentina/Buenos_Aires" },
                    { name: "Córdoba, Argentina", lat: -31.4201, lon: -64.1888, timezone: "America/Argentina/Cordoba" },
                    { name: "Rosario, Argentina", lat: -32.9468, lon: -60.6393, timezone: "America/Argentina/Buenos_Aires" },
                    { name: "Mendoza, Argentina", lat: -32.8908, lon: -68.8272, timezone: "America/Argentina/Mendoza" }
                  ].map((location, index) => (
                    <button
                      key={index}
                      onClick={() => handleLocationSelect(location)}
                      className="w-full text-left p-2 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{location.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
} 