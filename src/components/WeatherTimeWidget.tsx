import React, { useState, useEffect } from 'react';
import { Cloud, CloudRain, Sun, MapPin, Clock } from 'lucide-react';

const WeatherTimeWidget: React.FC = () => {
    const [weather, setWeather] = useState({
        temp: 0,
        condition: 'clear',
        city: 'Cargando...',
        loading: true
    });
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);

        // Hardcoded coordinates for Córdoba, Argentina
        const latitude = -31.4201;
        const longitude = -64.1888;

        const fetchWeather = async () => {
            try {
                const response = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
                );
                const data = await response.json();

                setWeather({
                    temp: Math.round(data.current_weather.temperature),
                    condition: data.current_weather.weathercode < 3 ? 'clear' : 'rain',
                    city: 'Córdoba',
                    loading: false
                });
            } catch (error) {
                console.error('Error fetching weather:', error);
                setWeather(prev => ({ ...prev, loading: false, city: 'Error' }));
            }
        };

        fetchWeather();

        return () => clearInterval(timer);
    }, []);

    const getWeatherIcon = () => {
        switch (weather.condition) {
            case 'clear': return <Sun className="w-5 h-5 text-amber-400" />;
            case 'rain': return <CloudRain className="w-5 h-5 text-blue-400" />;
            default: return <Cloud className="w-5 h-5 text-gray-400" />;
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-100">
            <div className="flex items-center justify-between gap-3">
                {/* Weather Section - Compact */}
                <div className="flex items-center gap-2">
                    {getWeatherIcon()}
                    <div>
                        <div className="text-sm font-semibold text-gray-800">
                            {weather.loading ? '--' : `${weather.temp}°C`}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate max-w-[80px]">{weather.city}</span>
                        </div>
                    </div>
                </div>

                {/* Time Section - Compact */}
                <div className="text-right">
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{time.toLocaleDateString('es-AR', { weekday: 'short' })}</span>
                    </div>
                    <div className="text-sm font-semibold text-gray-800">
                        {time.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WeatherTimeWidget;
