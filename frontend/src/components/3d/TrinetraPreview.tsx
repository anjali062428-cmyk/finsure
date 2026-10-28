import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FinSureCanvas } from './FinSureCanvas';
import { Fallback2DView } from './Fallback2DView';

interface TrinetraPreviewProps {
  payerVpa?: string;
  payeeVpa?: string;
  hopCount?: number;
  riskScore?: number;
  className?: string;
}

// 3D Visualizer Scene for Trinetra Graph
const TrinetraScene: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.2;
    }
  });

  // Nodes: Central source node + surrounding relational nodes
  const nodes = [
    { pos: [0, 0, 0] as [number, number, number], color: '#22D3EE', size: 0.28, isFlagged: false }, // Source account (cyan)
    { pos: [1.6, 0.8, -0.4] as [number, number, number], color: '#EF4444', size: 0.24, isFlagged: true }, // Flagged Mule Hub (red)
    { pos: [-1.3, 1.0, 0.5] as [number, number, number], color: '#14B8A6', size: 0.18, isFlagged: false }, // Verified counterparty (teal)
    { pos: [0.9, -1.3, 0.7] as [number, number, number], color: '#38BDF8', size: 0.19, isFlagged: false }, // Intermediate node (sky)
    { pos: [-1.4, -0.8, -0.6] as [number, number, number], color: '#14B8A6', size: 0.17, isFlagged: false }, // Secondary cluster (teal)
  ];

  return (
    <group ref={groupRef}>
      {/* Ambient & soft directional lighting */}
      <ambientLight intensity={0.7} />
      <pointLight position={[0, 0, 0]} intensity={1.5} color="#22D3EE" distance={5} />
      <pointLight position={[1.6, 0.8, -0.4]} intensity={2.0} color="#EF4444" distance={4} />

      {nodes.map((node, i) => (
        <mesh key={i} position={node.pos}>
          <sphereGeometry args={[node.size, 20, 20]} />
          <meshStandardMaterial
            color={node.color}
            emissive={node.color}
            emissiveIntensity={node.isFlagged ? 0.8 : 0.4}
            roughness={0.2}
            metalness={0.5}
          />
        </mesh>
      ))}

      {/* Edges from central node to counterparties with highlighted suspicious path */}
      {nodes.slice(1).map((node, i) => {
        const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(...node.pos)];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const lineColor = node.isFlagged ? '#EF4444' : '#22D3EE';
        const lineOpacity = node.isFlagged ? 0.9 : 0.35;
        return (
          <primitive
            key={`line-${i}`}
            object={new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: lineColor, transparent: true, opacity: lineOpacity }))}
          />
        );
      })}
    </group>
  );
};

export const TrinetraPreview: React.FC<TrinetraPreviewProps> = ({
  payerVpa = 'user942@okaxis',
  payeeVpa = 'suspicious_mule@ybl',
  hopCount = 3,
  riskScore = 84.5,
  className = '',
}) => {
  const summary = {
    'Source VPA': payerVpa,
    'Target VPA': payeeVpa,
    'Ego Hops': `${hopCount} degrees`,
    'Active Nodes': 18,
    'Relational Risk Score': `${riskScore}/100`,
    'Observed Cycles': '2 structural cycles (Under observation)',
  };

  const fallback2D = (
    <Fallback2DView
      title="Trinetra UPI Ego-Network Topology (2D Accessible View)"
      dataSummary={summary}
    >
      <div className="overflow-x-auto mt-2">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-border text-text-muted">
              <th className="py-1.5 px-2">VPA Node</th>
              <th className="py-1.5 px-2">Degree</th>
              <th className="py-1.5 px-2">Observed Relationship Role</th>
              <th className="py-1.5 px-2">Risk Band</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 font-mono">
            <tr>
              <td className="py-1.5 px-2 text-text font-medium">{payerVpa}</td>
              <td className="py-1.5 px-2">12</td>
              <td className="py-1.5 px-2 text-accent">Source Account</td>
              <td className="py-1.5 px-2 text-risk-low">Low (12/100)</td>
            </tr>
            <tr className="bg-risk-high/5">
              <td className="py-1.5 px-2 text-text font-medium">{payeeVpa}</td>
              <td className="py-1.5 px-2">147</td>
              <td className="py-1.5 px-2 text-risk-high">Potential Hub (Under observation)</td>
              <td className="py-1.5 px-2 text-risk-critical font-bold">Critical (92/100)</td>
            </tr>
            <tr>
              <td className="py-1.5 px-2 text-text font-medium">relay_layer_3@paytm</td>
              <td className="py-1.5 px-2">4</td>
              <td className="py-1.5 px-2 text-text-muted">Observed Cluster Forwarder</td>
              <td className="py-1.5 px-2 text-risk-high">High (78/100)</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-text-muted italic mt-2">
        Notice: In accordance with FinSure evidence standards, relationships are categorized using observed graph topology. No account is labeled confirmed fraud without formal analyst adjudication.
      </p>
    </Fallback2DView>
  );

  return (
    <FinSureCanvas
      title="Trinetra 3D UPI Graph"
      fallback2D={fallback2D}
      fallbackSummary={summary}
      className={className}
      cameraPosition={[0, 0, 4]}
      height="320px"
    >
      <TrinetraScene />
    </FinSureCanvas>
  );
};
