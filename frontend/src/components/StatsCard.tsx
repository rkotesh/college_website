// src/components/StatsCard.tsx
import React from "react";

type StatsCardProps = {
  label: string;
  value: string;
  icon?: React.ReactNode;
};

export default function StatsCard({ label, value, icon }: StatsCardProps) {
  return (
    <div className="stats-card">
      <div className="icon" style={{ fontSize: "2rem" }}>{icon}</div>
      <div className="value" style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{value}</div>
      <div className="label" style={{ color: "#555" }}>{label}</div>
    </div>
  );
}
