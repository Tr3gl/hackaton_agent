import React from "react";
import type { Language, WeatherData } from "@/lib/types";

interface WeatherWidgetProps {
  weather: WeatherData;
  language: Language;
}

function getWeatherIcon(condition: string): string {
  const c = condition.toLowerCase();
  if (c.includes("clear") || c.includes("sun")) return "☀️";
  if (c.includes("cloud")) return "☁️";
  if (c.includes("rain") || c.includes("drizzle")) return "🌧️";
  if (c.includes("snow")) return "❄️";
  if (c.includes("thunder") || c.includes("storm")) return "⛈️";
  if (c.includes("fog") || c.includes("mist") || c.includes("haze")) return "🌫️";
  if (c.includes("wind")) return "💨";
  return "🌤️";
}

export function WeatherWidget({ weather, language }: WeatherWidgetProps) {
  const icon = getWeatherIcon(weather.condition);
  const windUnit = language === "tr" ? "km/sa" : "km/h";

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-sand-200 bg-gradient-to-r from-sage-600/5 to-sage-400/10 px-4 py-3 shadow-sm">
      <span className="text-2xl">{icon}</span>
      <div className="flex flex-col">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-sage-600">
          {weather.location}
        </span>
        <div className="flex items-center gap-3 text-sm text-ink-900">
          <span className="font-bold">{weather.temp_c}°C</span>
          <span className="text-ink-700">{weather.condition}</span>
          {weather.wind_speed > 0 && (
            <span className="text-ink-700">💨 {weather.wind_speed} {windUnit}</span>
          )}
        </div>
      </div>
    </div>
  );
}
