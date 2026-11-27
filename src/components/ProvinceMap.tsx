import React, { useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import type { Layer, PathOptions } from "leaflet";
import "leaflet/dist/leaflet.css";

import barmmData from "@/data/public/barmm.json";
import cotabatoCityData from "@/data/public/cotabato-city.json";
import batanesData from "@/data/public/batanes-municipalities.json";
import { REGION_CONFIG, type ElectionRegion } from "@/types";

interface ProvinceMapProps {
  region: ElectionRegion;
  provinceCounts: Record<string, number>;
}

function MapViewportController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [map, center, zoom]);
  return null;
}

const getColor = (count: number): string => {
  if (count > 50) return "#991b1b";
  if (count > 20) return "#dc2626";
  if (count > 10) return "#f97316";
  if (count > 0) return "#fde047";
  return "#e2e8f0";
};

const LEGEND_ITEMS = [
  { label: "50+ Incidents", color: "#991b1b" },
  { label: "21 - 50 Incidents", color: "#dc2626" },
  { label: "11 - 20 Incidents", color: "#f97316" },
  { label: "1 - 10 Incidents", color: "#fde047" },
  { label: "0 Incidents", color: "#e2e8f0" },
];

export function ProvinceMap({ region, provinceCounts }: ProvinceMapProps) {
  const geoJsonData = barmmData as any;
  const cotabatoGeoJson = cotabatoCityData as any;
  const batanesGeoJson = batanesData as any;
  const regionConfig = REGION_CONFIG[region];

  const extractFeatureName = (feature: any): string => {
    let name =
      feature?.properties?.PROV_NAM ||
      feature?.properties?.ADM3_EN ||
      feature?.properties?.adm3_en ||
      feature?.properties?.ADM2_EN ||
      feature?.properties?.adm2_en ||
      feature?.properties?.name ||
      "";

    if (!name && feature?.id === 1909900000) {
      name = "Special Geographic Area";
    }
    return name;
  };

  const styleFeature = (feature: any): PathOptions => {
    const featureName = extractFeatureName(feature);

    const normalizedName = featureName.toUpperCase();
    const lookupName = normalizedName === "COTABATO CITY" ? "COTABATO CITY (ICC)" : normalizedName;

    const matchedKey = Object.keys(provinceCounts).find(
      key => key.toUpperCase() === lookupName
    );
    const count = matchedKey ? provinceCounts[matchedKey] : 0;

    return {
      fillColor: getColor(count),
      weight: 2,
      opacity: 1,
      color: "#ffffff",
      dashArray: "3",
      fillOpacity: 0.8,
    };
  };

  const onEachFeature = (feature: any, layer: Layer) => {
    const featureName = extractFeatureName(feature);

    const displayName = featureName.toUpperCase() === "COTABATO CITY"
      ? "Cotabato City (ICC)"
      : featureName;

    const normalizedName = featureName.toUpperCase();
    const lookupName = normalizedName === "COTABATO CITY" ? "COTABATO CITY (ICC)" : normalizedName;

    // Case-insensitive search through the provinceCounts keys
    const matchedKey = Object.keys(provinceCounts).find(
      key => key.toUpperCase() === lookupName
    );
    const count = matchedKey ? provinceCounts[matchedKey] : 0;

    layer.bindTooltip(
      `<strong>${displayName || "Unknown Region"}</strong><br/>${count} verified incident${count === 1 ? "" : "s"}`,
      { sticky: true }
    );
  };

  return (
    <div className="relative w-full h-80 rounded-lg overflow-hidden border border-slate-200">
      <MapContainer
        center={regionConfig.mapCenter}
        zoom={regionConfig.mapZoom}
        scrollWheelZoom={false}
        className="w-full h-full z-0"
      >
        <MapViewportController center={regionConfig.mapCenter} zoom={regionConfig.mapZoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        />
        {region === "barmm" && geoJsonData && (
          <GeoJSON
            key={`barmm-${JSON.stringify(provinceCounts)}`}
            data={geoJsonData}
            style={styleFeature}
            onEachFeature={onEachFeature}
          />
        )}
        {/* Rendered after the BARMM layer so it draws on top of Maguindanao del
            Norte's polygon — Cotabato City is an independent city and isn't
            part of the BARMM province boundaries above, so it needs its own
            overlay to show up as a distinct shaded area. */}
        {region === "barmm" && cotabatoGeoJson && (
          <GeoJSON
            key={`cotabato-city-${JSON.stringify(provinceCounts)}`}
            data={cotabatoGeoJson}
            style={styleFeature}
            onEachFeature={onEachFeature}
          />
        )}
        {region === "batanes" && batanesGeoJson && (
          <GeoJSON
            key={`batanes-${JSON.stringify(provinceCounts)}`}
            data={batanesGeoJson}
            style={styleFeature}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>

      <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm p-3 rounded-md shadow-md border border-slate-200 text-xs z-10 space-y-1.5 pointer-events-none">
        <p className="font-semibold text-slate-700 mb-1">Incident Density</p>
        {LEGEND_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-sm border border-black/10"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-slate-600">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}