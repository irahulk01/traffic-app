import React from 'react';
import { AlertTriangle } from 'lucide-react';
import CorridorCard from './CorridorCard';

export default function CorridorCardsFeed({
  streets = [],
  selectedStreet,
  onSelectStreet,
}) {
  if (streets.length === 0) {
    return (
      <div className="corridors-empty-state">
        <AlertTriangle size={28} className="empty-state-icon" />
        <h4>No corridors found under this filter</h4>
        <p>Select "All Roads" to view the full city traffic grid.</p>
      </div>
    );
  }

  return (
    <div className="corridor-cards-feed">
      {streets.map((street) => (
        <CorridorCard
          key={street.id}
          street={street}
          isSelected={selectedStreet?.id === street.id}
          onSelect={onSelectStreet}
        />
      ))}
    </div>
  );
}
