import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FinSureCanvas } from './FinSureCanvas';
import { Fallback2DView } from './Fallback2DView';

interface RiskCorePreviewProps {
  className?: string;
  height?: string;
}

const CoreScene: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const vaultRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const coreLightRef = useRef<THREE.PointLight>(null);

  // Traveling signal beacons
  const beacon1Ref = useRef<THREE.Mesh>(null);
  const beacon2Ref = useRef<THREE.Mesh>(null);
  const beacon3Ref = useRef<THREE.Mesh>(null);

  const clockRef = useRef(0);

  useFrame((state, delta) => {
    clockRef.current += delta;
    const t = clockRef.current;

    // Smooth subtle mouse parallax
    if (groupRef.current) {
      const targetRotX = state.pointer.y * 0.22;
      const targetRotY = state.pointer.x * 0.32;
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        targetRotX,
        delta * 2.0
      );
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        targetRotY,
        delta * 2.0
      );
      // Gentle floating levitation
      groupRef.current.position.y = Math.sin(t * 0.8) * 0.08;
    }

    // Slow, stately vault rotation
    if (vaultRef.current) {
      vaultRef.current.rotation.y += delta * 0.12;
      vaultRef.current.rotation.x += delta * 0.05;
    }

    // Inner glowing core rotation and subtle pulse
    if (innerRef.current && vaultRef.current) {
      innerRef.current.rotation.y = -vaultRef.current.rotation.y * 1.5;
      innerRef.current.rotation.z = vaultRef.current.rotation.x * 1.2;
      const innerPulse = 1 + Math.sin(t * 2.0) * 0.04;
      innerRef.current.scale.set(innerPulse, innerPulse, innerPulse);
    }

    // Pulsing point light inside the vault
    if (coreLightRef.current) {
      coreLightRef.current.intensity = 3.2 + Math.sin(t * 2.0) * 0.8;
    }

    // Signal Beacon 1: Transaction Ribbon (Electric Cyan)
    if (beacon1Ref.current) {
      const angle1 = t * 1.4;
      beacon1Ref.current.position.set(Math.cos(angle1) * 2.5, Math.sin(angle1) * 2.5, 0);
    }

    // Signal Beacon 2: Behavior Ribbon (Primary Cyan)
    if (beacon2Ref.current) {
      const angle2 = t * 1.1 + 1.2;
      beacon2Ref.current.position.set(Math.cos(angle2) * 2.9, Math.sin(angle2) * 2.9, 0);
    }

    // Signal Beacon 3: Network Ribbon (Radiant Teal)
    if (beacon3Ref.current) {
      const angle3 = t * 1.25 + 2.5;
      beacon3Ref.current.position.set(Math.cos(angle3) * 3.3, Math.sin(angle3) * 3.3, 0);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Controlled Atmospheric & Studio Lighting */}
      <ambientLight intensity={0.7} />
      <directionalLight position={[6, 8, 5]} intensity={1.8} color="#E0F2FE" />
      <directionalLight position={[-6, -4, -3]} intensity={1.0} color="#14B8A6" />
      <directionalLight position={[0, -6, 2]} intensity={0.4} color="#0B1D2A" />
      <pointLight
        ref={coreLightRef}
        position={[0, 0, 0]}
        intensity={3.2}
        color="#19D3C5"
        distance={8}
      />

      {/* Main Solid Vault Composition */}
      <group ref={vaultRef}>
        {/* Central Dark Metallic Primary Block with Chamfer Inset */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.65, 1.65, 1.65]} />
          <meshStandardMaterial
            color="#05080D"
            emissive="#03060A"
            metalness={0.94}
            roughness={0.16}
          />
        </mesh>

        {/* Intersecting Faceted Geometry creating Bevelled / Chiseled Edges */}
        <mesh position={[0, 0, 0]}>
          <dodecahedronGeometry args={[1.32, 0]} />
          <meshStandardMaterial
            color="#0B1D2A"
            emissive="#06111B"
            metalness={0.88}
            roughness={0.24}
          />
        </mesh>

        {/* 8 Corner Protective Armor Brackets */}
        {[
          [-0.82, -0.82, -0.82], [0.82, -0.82, -0.82],
          [-0.82, 0.82, -0.82], [0.82, 0.82, -0.82],
          [-0.82, -0.82, 0.82], [0.82, -0.82, 0.82],
          [-0.82, 0.82, 0.82], [0.82, 0.82, 0.82],
        ].map((pos, idx) => (
          <mesh key={`corner-${idx}`} position={pos as [number, number, number]}>
            <boxGeometry args={[0.34, 0.34, 0.34]} />
            <meshStandardMaterial
              color="#102B3C"
              metalness={0.95}
              roughness={0.15}
            />
          </mesh>
        ))}

        {/* Recessed Glowing Teal Channel Seams along Face Centers */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.67, 0.05, 1.67]} />
          <meshBasicMaterial color="#19D3C5" transparent opacity={0.85} />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.05, 1.67, 1.67]} />
          <meshBasicMaterial color="#19D3C5" transparent opacity={0.85} />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.67, 1.67, 0.05]} />
          <meshBasicMaterial color="#19D3C5" transparent opacity={0.85} />
        </mesh>

        {/* Transparent Crystalline Outer Protective Shell */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2.12, 2.12, 2.12]} />
          <meshStandardMaterial
            color="#A7F3D0"
            emissive="#19D3C5"
            emissiveIntensity={0.14}
            metalness={0.3}
            roughness={0.08}
            transparent
            opacity={0.22}
          />
        </mesh>

        {/* Subtle Outer Shell Edge Insets */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2.14, 2.14, 2.14]} />
          <meshBasicMaterial
            color="#19D3C5"
            wireframe
            transparent
            opacity={0.35}
          />
        </mesh>

        {/* Inner Glowing Radiant Core Jewel */}
        <mesh ref={innerRef} position={[0, 0, 0]}>
          <octahedronGeometry args={[0.88, 0]} />
          <meshStandardMaterial
            color="#19D3C5"
            emissive="#19D3C5"
            emissiveIntensity={2.8}
            metalness={0.3}
            roughness={0.1}
          />
        </mesh>
      </group>

      {/* ========================================================
          4 CURVED PROTECTIVE ORBITAL RINGS (Cyan -> Teal -> Blue -> Violet/Purple)
          ======================================================== */}

      {/* Ring 1: Electric Cyan (#19D3FF) - Velocity / Transaction */}
      <group rotation={[0.28, 0, 0]}>
        <mesh>
          <torusGeometry args={[2.4, 0.038, 24, 120]} />
          <meshStandardMaterial
            color="#19D3FF"
            emissive="#19D3FF"
            emissiveIntensity={0.8}
            metalness={0.8}
            roughness={0.18}
          />
        </mesh>
        {/* Tiny Telemetry Nodes */}
        <mesh position={[2.4, 0, 0]}>
          <octahedronGeometry args={[0.08, 0]} />
          <meshStandardMaterial color="#FFFFFF" emissive="#19D3FF" emissiveIntensity={1.8} />
        </mesh>
        <mesh position={[-2.4, 0, 0]}>
          <octahedronGeometry args={[0.08, 0]} />
          <meshStandardMaterial color="#FFFFFF" emissive="#19D3FF" emissiveIntensity={1.8} />
        </mesh>
        {/* Traveling Signal Beacon */}
        <mesh ref={beacon1Ref}>
          <sphereGeometry args={[0.11, 24, 24]} />
          <meshStandardMaterial color="#FFFFFF" emissive="#19D3FF" emissiveIntensity={3.0} />
        </mesh>
      </group>

      {/* Ring 2: Brand Teal (#19D3C5 / #20E0C0) - Behavior / Device */}
      <group rotation={[0.85, 0.35, 0]}>
        <mesh>
          <torusGeometry args={[2.75, 0.035, 24, 120]} />
          <meshStandardMaterial
            color="#20E0C0"
            emissive="#19D3C5"
            emissiveIntensity={0.7}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
        {/* Tiny Telemetry Nodes */}
        <mesh position={[0, 2.75, 0]}>
          <boxGeometry args={[0.09, 0.09, 0.09]} />
          <meshStandardMaterial color="#FFFFFF" emissive="#20E0C0" emissiveIntensity={1.6} />
        </mesh>
        <mesh position={[0, -2.75, 0]}>
          <boxGeometry args={[0.09, 0.09, 0.09]} />
          <meshStandardMaterial color="#FFFFFF" emissive="#20E0C0" emissiveIntensity={1.6} />
        </mesh>
        {/* Traveling Signal Beacon */}
        <mesh ref={beacon2Ref}>
          <sphereGeometry args={[0.11, 24, 24]} />
          <meshStandardMaterial color="#FFFFFF" emissive="#20E0C0" emissiveIntensity={3.0} />
        </mesh>
      </group>

      {/* Ring 3: Electric Blue (#4F8CFF / #5B7CFF) - Network Topology */}
      <group rotation={[-0.65, 0.45, 0.2]}>
        <mesh>
          <torusGeometry args={[3.15, 0.034, 24, 120]} />
          <meshStandardMaterial
            color="#4F8CFF"
            emissive="#5B7CFF"
            emissiveIntensity={0.7}
            metalness={0.8}
            roughness={0.22}
          />
        </mesh>
        {/* Tiny Telemetry Nodes */}
        <mesh position={[3.15, 0, 0]}>
          <octahedronGeometry args={[0.08, 0]} />
          <meshStandardMaterial color="#FFFFFF" emissive="#4F8CFF" emissiveIntensity={1.5} />
        </mesh>
        <mesh position={[-3.15, 0, 0]}>
          <octahedronGeometry args={[0.08, 0]} />
          <meshStandardMaterial color="#FFFFFF" emissive="#4F8CFF" emissiveIntensity={1.5} />
        </mesh>
        {/* Traveling Signal Beacon */}
        <mesh ref={beacon3Ref}>
          <sphereGeometry args={[0.10, 24, 24]} />
          <meshStandardMaterial color="#FFFFFF" emissive="#4F8CFF" emissiveIntensity={2.8} />
        </mesh>
      </group>

      {/* Ring 4: Violet to Purple (#8B5CF6 / #A855F7) - AI Meta Decision */}
      <group rotation={[-1.15, -0.4, 0.35]}>
        <mesh>
          <torusGeometry args={[3.55, 0.030, 24, 120]} />
          <meshStandardMaterial
            color="#8B5CF6"
            emissive="#A855F7"
            emissiveIntensity={0.65}
            metalness={0.8}
            roughness={0.25}
          />
        </mesh>
        {/* Tiny Telemetry Nodes */}
        <mesh position={[0, 3.55, 0]}>
          <octahedronGeometry args={[0.08, 0]} />
          <meshStandardMaterial color="#FFFFFF" emissive="#8B5CF6" emissiveIntensity={1.6} />
        </mesh>
        <mesh position={[0, -3.55, 0]}>
          <octahedronGeometry args={[0.08, 0]} />
          <meshStandardMaterial color="#FFFFFF" emissive="#A855F7" emissiveIntensity={1.6} />
        </mesh>
      </group>
    </group>
  );
};

export const RiskCorePreview: React.FC<RiskCorePreviewProps> = ({
  className = '',
  height = '480px',
}) => {
  const summary = {
    'Risk Core': 'FinSure Multi-Signal Defense',
    'Transaction Activity': 'Velocity + amount deviation',
    'Behavior Pattern': 'Device signature & timing',
    'Connected Accounts': 'Network relationship graph',
    'Decision Time': 'Under 100 milliseconds',
  };

  const fallback2D = (
    <Fallback2DView
      title="FinSure Risk Intelligence Core"
      dataSummary={summary}
    >
      <div className="space-y-3 mt-4 text-xs font-sans text-text-muted">
        <p>
          FinSure continuously analyzes transactions across transaction activity, customer behavior,
          and network relationships to identify unusual payments before they become fraud losses.
        </p>
      </div>
    </Fallback2DView>
  );

  return (
    <div className={`w-full flex items-center justify-center ${className}`}>
      <FinSureCanvas
        title="FinSure Risk Intelligence Core"
        fallback2D={fallback2D}
        fallbackSummary={summary}
        cameraPosition={[0, 0.05, 4.4]}
        height={height}
        hideControls={true}
      >
        <CoreScene />
      </FinSureCanvas>
    </div>
  );
};
