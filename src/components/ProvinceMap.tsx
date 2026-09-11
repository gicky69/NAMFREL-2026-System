import React from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { Layer, PathOptions } from "leaflet";
import "leaflet/dist/leaflet.css";

import barmmData from "@/data/public/barmm.json";

interface ProvinceMapProps {
  provinceCounts: Record<string, number>;
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

export function ProvinceMap({ provinceCounts }: ProvinceMapProps) {
  const geoJsonData = barmmData as any;

  const styleFeature = (feature: any): PathOptions => {
    let provinceName =
      feature?.properties?.PROV_NAM ||
      feature?.properties?.ADM2_EN ||
      feature?.properties?.adm2_en ||
      feature?.properties?.name ||
      "";

    if (!provinceName && feature?.id === 1909900000) {
      provinceName = "Special Geographic Area";
    }

    const normalizedName = provinceName.toUpperCase();
    const count = provinceCounts[normalizedName] || 0;

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
    let provinceName =
      feature?.properties?.PROV_NAM ||
      feature?.properties?.ADM2_EN ||
      feature?.properties?.adm2_en ||
      feature?.properties?.name ||
      "";

    if (!provinceName && feature?.id === 1909900000) {
      provinceName = "Special Geographic Area";
    }

    const normalizedName = provinceName.toUpperCase();
    const count = provinceCounts[normalizedName] || 0;

    layer.bindTooltip(
      `<strong>${provinceName || "Unknown Region"}</strong><br/>${count} verified incident${count === 1 ? "" : "s"}`,
      { sticky: true }
    );
  };

  return (
    <div className="relative w-full h-80 rounded-lg overflow-hidden border border-slate-200">
      <MapContainer
        center={[6.6, 122.2]}
        zoom={7}
        scrollWheelZoom={false}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        />
        {geoJsonData && (
          <GeoJSON
            key={JSON.stringify(provinceCounts)}
            data={geoJsonData}
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