import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FinSureCanvas } from './FinSureCanvas';
import { Fallback2DView } from './Fallback2DView';

interface ThreatGlobePreviewProps {
  activeThreatCount?: number;
  highVelocityRegion?: string;
  className?: string;
}

const ThreatGlobeScene: React.FC = () => {
  const globeRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (globeRef.current) {
      globeRef.current.rotation.y += delta * 0.12;
    }
  });

  // Points representing synthetic Indian geographic hubs
  const hubCoords = [
    [0.2, 0.4, 1.4] as [number, number, number], // Delhi
    [-0.3, -0.1, 1.45] as [number, number, number], // Mumbai
    [0.1, -0.6, 1.35] as [number, number, number], // Bengaluru
    [0.7, 0.1, 1.3] as [number, number, number], // Kolkata
    [0.2, -0.3, 1.42] as [number, number, number], // Hyderabad
  ];

  return (
    <group ref={globeRef}>
      {/* Wireframe Globe Sphere */}
      <mesh>
        <sphereGeometry args={[1.5, 24, 24]} />
        <meshStandardMaterial
          color="#334155"
          wireframe
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* Synthetic Geolocation Points */}
      {hubCoords.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color={i === 1 ? '#ef4444' : '#0284c7'} />
        </mesh>
      ))}
    </group>
  );
};

export const ThreatGlobePreview: React.FC<ThreatGlobePreviewProps> = ({
  activeThreatCount = 14,
  highVelocityRegion = 'Mumbai Hub (Synthetic)',
  className = '',
}) => {
  const summary = {
    'Threat Vectors': `${activeThreatCount} active`,
    'High Velocity Hub': highVelocityRegion,
    'Synthetic Rails': 'NPCI Sim Sandbox',
    'Cross-State Dispersion': '4 states detected',
    'Max Hop Speed': '2.1s inter-hub velocity',
  };

  const fallback2D = (
    <Fallback2DView
      title="UPI Geographic Velocity Threat Map"
      dataSummary={summary}
    >
      <div className="space-y-1.5 mt-2 text-xs">
        <div className="flex justify-between p-2 rounded bg-surface-muted border border-border/40">
          <span className="font-mono text-text">Mumbai Hub (Synthetic)</span>
          <span className="text-risk-critical font-bold">14 High-Speed Transfers (Alert)</span>
        </div>
        <div className="flex justify-between p-2 rounded bg-surface-muted border border-border/40">
          <span className="font-mono text-text">Bengaluru Hub (Synthetic)</span>
          <span className="text-risk-medium font-medium">3 Challenge Events</span>
        </div>
        <div className="flex justify-between p-2 rounded bg-surface-muted border border-border/40">
          <span className="font-mono text-text">Delhi NCR Hub (Synthetic)</span>
          <span className="text-risk-low font-medium">Nominal Velocity</span>
        </div>
      </div>
    </Fallback2DView>
  );

  return (
    <FinSureCanvas
      title="Threat Replay 3D Spatial Map"
      fallback2D={fallback2D}
      fallbackSummary={summary}
      className={className}
      cameraPosition={[0, 0, 4]}
      height="320px"
    >
      <ThreatGlobeScene />
    </FinSureCanvas>
  );
};
