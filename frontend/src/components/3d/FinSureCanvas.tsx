import React, { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { useTheme } from '../../context/ThemeContext';
import { Fallback2DView } from './Fallback2DView';

interface FinSureCanvasProps {
  title: string;
  children: React.ReactNode;
  fallback2D?: React.ReactNode;
  fallbackSummary?: Record<string, string | number>;
  className?: string;
  cameraPosition?: [number, number, number];
  height?: string | number;
  hideControls?: boolean;
}

// WebGL capability detector supporting WebGL2 and WebGL1
export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') ||
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

export const FinSureCanvas: React.FC<FinSureCanvasProps> = ({
  title,
  children,
  fallback2D,
  fallbackSummary,
  className = '',
  cameraPosition = [0, 0, 5],
  height = '400px',
  hideControls = false,
}) => {
  const { is3DEnabled, toggle3D, reducedMotion } = useTheme();
  const [webGLSupported, setWebGLSupported] = useState<boolean>(true);
  const [renderError, setRenderError] = useState<boolean>(false);

  useEffect(() => {
    setWebGLSupported(isWebGLAvailable());
  }, []);

  // Determine fallback condition: ONLY when WebGL fails, reduced motion is set, or user opted for 2D
  const shouldRenderFallback =
    !is3DEnabled || reducedMotion || !webGLSupported || renderError;

  const fallbackReason = !webGLSupported
    ? 'Hardware WebGL Acceleration Unavailable'
    : reducedMotion
    ? 'User Reduced Motion Preference Active'
    : renderError
    ? '3D Context Error — Fallen back to 2D'
    : 'User Opted for 2D Mode';

  // When fallback is active, render ONLY the 2D view cleanly without any 3D canvas
  if (shouldRenderFallback) {
    if (fallback2D) {
      return <div className={`w-full ${className}`}>{fallback2D}</div>;
    }

    return (
      <Fallback2DView
        title={title}
        reason={fallbackReason}
        dataSummary={fallbackSummary}
        onToggle3D={webGLSupported && !reducedMotion ? toggle3D : undefined}
        className={className}
      />
    );
  }

  // Real 3D mode: Clean, pristine viewport without any overlapping 2D text or debug badges
  return (
    <div
      style={{ height }}
      className={`relative w-full overflow-hidden ${className}`}
      role="region"
      aria-label={`${title} 3D Interactive View`}
    >
      {/* Screen-reader accessible alternative: completely hidden from visual render */}
      <div className="sr-only" aria-live="polite">
        {title} 3D interactive visualization active. Hardware accelerated WebGL scene.
      </div>

      {/* Optional minimal switch control for analysts */}
      {!hideControls && (
        <div className="absolute top-3 right-3 z-10 opacity-70 hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={toggle3D}
            aria-label="Switch 3D view to accessible 2D view"
            className="text-[11px] font-mono px-2 py-0.5 rounded bg-editorial-dark/80 text-text-muted hover:text-text border border-border backdrop-blur-sm transition-colors"
          >
            2D Mode
          </button>
        </div>
      )}

      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center">
            <span className="text-xs font-mono text-text-muted animate-pulse">
              Loading 3D scene...
            </span>
          </div>
        }
      >
        <Canvas
          camera={{ position: cameraPosition, fov: 42 }}
          onError={() => setRenderError(true)}
          style={{ width: '100%', height: '100%', pointerEvents: 'auto' }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        >
          {children}
        </Canvas>
      </Suspense>
    </div>
  );
};
