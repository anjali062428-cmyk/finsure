import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FinSureCanvas } from './FinSureCanvas';
import { Fallback2DView } from './Fallback2DView';

export type VerdictDecisionType = 'APPROVED' | 'STEP-UP' | 'COOLING PERIOD' | 'BLOCKED';

interface VerdictGatePreviewProps {
  xgboostScore?: number;
  sequenceScore?: number;
  gnnScore?: number;
  autoencoderScore?: number;
  decision?: VerdictDecisionType;
  calibratedVerdict?: string;
  className?: string;
}

const VerdictGateScene: React.FC<{ decisionColor: string }> = ({ decisionColor }) => {
  const gateRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (gateRef.current) {
      gateRef.current.rotation.y += delta * 0.15;
    }
  });

  // 4 model pillars converging toward central gate
  const pillars = [
    { pos: [-1.5, 0, 0] as [number, number, number], color: '#3b82f6', label: 'XGBoost' },
    { pos: [-0.5, 0.8, -0.4] as [number, number, number], color: '#10b981', label: 'Sequence' },
    { pos: [0.5, -0.6, 0.4] as [number, number, number], color: '#f59e0b', label: 'Graph GNN' },
    { pos: [1.5, 0, 0] as [number, number, number], color: '#8b5cf6', label: 'Autoencoder' },
  ];

  return (
    <group ref={gateRef}>
      {/* Central Gate Ring */}
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[1.8, 0.05, 16, 64]} />
        <meshStandardMaterial color="#0284c7" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Model Convergence Pillars */}
      {pillars.map((p, i) => (
        <mesh key={i} position={p.pos}>
          <cylinderGeometry args={[0.15, 0.15, 1.2, 16]} />
          <meshStandardMaterial color={p.color} roughness={0.4} />
        </mesh>
      ))}

      {/* Central Authoritative Verdict Core */}
      <mesh position={[0, 0, 0]}>
        <octahedronGeometry args={[0.35, 0]} />
        <meshStandardMaterial color={decisionColor} wireframe />
      </mesh>
    </group>
  );
};

export const VerdictGatePreview: React.FC<VerdictGatePreviewProps> = ({
  xgboostScore = 0.89,
  sequenceScore = 0.76,
  gnnScore = 0.62,
  autoencoderScore = 0.45,
  decision = 'BLOCKED',
  calibratedVerdict = 'BLOCKED (Calibrated Score 91.2)',
  className = '',
}) => {
  const getDecisionColor = (d: VerdictDecisionType) => {
    switch (d) {
      case 'APPROVED':
        return '#10b981';
      case 'STEP-UP':
        return '#f59e0b';
      case 'COOLING PERIOD':
        return '#0284c7';
      case 'BLOCKED':
      default:
        return '#ef4444';
    }
  };

  const decisionColor = getDecisionColor(decision);

  const summary = {
    'Pipeline Flow': 'Transaction → FinSure Analysis → Decision',
    'Classical XGBoost': `${(xgboostScore * 100).toFixed(1)}%`,
    'Sequence LSTM': `${(sequenceScore * 100).toFixed(1)}%`,
    'GraphSAGE GNN': `${(gnnScore * 100).toFixed(1)}%`,
    'Autoencoder Anomaly': `${(autoencoderScore * 100).toFixed(1)}%`,
    'Backend Decision': decision,
    'Ensemble Gate Verdict': calibratedVerdict,
  };

  const fallback2D = (
    <Fallback2DView
      title="Verdict Gate Multi-Model Pipeline (2D Accessible View)"
      dataSummary={summary}
    >
      <div className="space-y-3 mt-3">
        {/* Pipeline Flow Indicator */}
        <div className="flex items-center justify-between text-[11px] font-mono p-2 rounded bg-surface-muted border border-border">
          <span className="text-text font-semibold">1. Transaction</span>
          <span className="text-text-muted">→</span>
          <span className="text-accent font-semibold">2. FinSure Multi-Model</span>
          <span className="text-text-muted">→</span>
          <span
            className="font-bold px-1.5 py-0.5 rounded"
            style={{ color: decisionColor, backgroundColor: `${decisionColor}15` }}
          >
            3. {decision}
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs p-2 rounded bg-surface-muted border border-border/40">
            <span className="font-medium text-text">XGBoost Classical Baseline</span>
            <span className="font-mono text-accent font-semibold">P = {xgboostScore.toFixed(3)}</span>
          </div>
          <div className="flex justify-between items-center text-xs p-2 rounded bg-surface-muted border border-border/40">
            <span className="font-medium text-text">Sequence Temporal LSTM</span>
            <span className="font-mono text-risk-medium font-semibold">P = {sequenceScore.toFixed(3)}</span>
          </div>
          <div className="flex justify-between items-center text-xs p-2 rounded bg-surface-muted border border-border/40">
            <span className="font-medium text-text">GraphSAGE Relational Topology</span>
            <span className="font-mono text-text-muted font-semibold">P = {gnnScore.toFixed(3)}</span>
          </div>
          <div className="flex justify-between items-center text-xs p-2 rounded bg-surface-muted border border-border/40">
            <span className="font-medium text-text">Autoencoder Reconstruction Anomaly</span>
            <span className="font-mono text-text-muted font-semibold">P = {autoencoderScore.toFixed(3)}</span>
          </div>
        </div>

        <div
          className="p-3 rounded-lg border font-mono text-xs flex items-center justify-between"
          style={{
            borderColor: `${decisionColor}40`,
            backgroundColor: `${decisionColor}10`,
            color: decisionColor,
          }}
        >
          <span className="font-bold">Authoritative Gate Decision:</span>
          <span className="font-extrabold uppercase">{calibratedVerdict}</span>
        </div>

        <p className="text-[11px] text-text-muted italic">
          Disclaimer: Visual geometry is presentation only. All decisions and probabilities are generated exclusively by the backend model registry.
        </p>
      </div>
    </Fallback2DView>
  );

  return (
    <FinSureCanvas
      title="Verdict Gate 3D Ensemble Flow"
      fallback2D={fallback2D}
      fallbackSummary={summary}
      className={className}
      cameraPosition={[0, 0, 4.5]}
      height="320px"
    >
      <VerdictGateScene decisionColor={decisionColor} />
    </FinSureCanvas>
  );
};
