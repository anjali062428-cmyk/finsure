import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface CurrencyHero3DProps {
  className?: string;
}

/**
 * Procedural Texture Generator for Decorative Forensic Currency & Documents
 * Creates high-resolution, vector-crisp textures directly onto HTML5 canvases:
 * - Indian Rupee (₹500) Specimen Note
 * - US Dollar ($100) Specimen Note
 * - Euro (€100) Specimen Note
 * - British Pound (£50) Specimen Note
 * - Bank Audit Statement Document
 * - Thermal POS Transaction Receipts
 *
 * NOTE: All banknotes are clearly marked "SPECIMEN / FORENSIC REFERENCE"
 * and serve solely as decorative visual references for financial forensics.
 */
function createBanknoteTexture(
  type: 'inr' | 'usd' | 'eur' | 'gbp'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const w = canvas.width;
  const h = canvas.height;

  // Background base tone
  let bgGradient = ctx.createLinearGradient(0, 0, w, h);
  let accentColor = '#A68B61';
  let borderLineColor = 'rgba(208, 197, 177, 0.4)';
  let textColor = '#E9E3D5';
  let denomination = '₹500';
  let subtitle = 'RESERVE FORENSIC SPECIMEN';

  if (type === 'inr') {
    // Indian Rupee: Stone / Muted Gold / Warm Charcoal
    bgGradient.addColorStop(0, '#2D302B');
    bgGradient.addColorStop(0.5, '#3A3D36');
    bgGradient.addColorStop(1, '#262924');
    accentColor = '#C2A36B';
    denomination = '₹500';
    subtitle = 'FINSURE RESERVE SPECIMEN // INR 500';
  } else if (type === 'usd') {
    // US Dollar: Muted Forest Green / Slate
    bgGradient.addColorStop(0, '#232E27');
    bgGradient.addColorStop(0.5, '#2F3C34');
    bgGradient.addColorStop(1, '#1E2822');
    accentColor = '#6A947A';
    denomination = '$100';
    subtitle = 'UNITED STATES FORENSIC SPECIMEN';
  } else if (type === 'eur') {
    // Euro: Muted Ochre / Warm Gold / Stone
    bgGradient.addColorStop(0, '#363227');
    bgGradient.addColorStop(0.5, '#423D30');
    bgGradient.addColorStop(1, '#2B271F');
    accentColor = '#B89F67';
    denomination = '€100';
    subtitle = 'EUROPEAN FORENSIC SPECIMEN';
  } else if (type === 'gbp') {
    // British Pound: Slate / Warm Clay / Crimson Stone
    bgGradient.addColorStop(0, '#362D2C');
    bgGradient.addColorStop(0.5, '#453836');
    bgGradient.addColorStop(1, '#2B2322');
    accentColor = '#B0887A';
    denomination = '£50';
    subtitle = 'BANK OF FORENSICS SPECIMEN // £50';
  }

  // 1. Fill note surface
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, w, h);

  // 2. Paper fiber texture noise
  ctx.fillStyle = 'rgba(233, 227, 213, 0.04)';
  for (let i = 0; i < 400; i++) {
    const rx = Math.random() * w;
    const ry = Math.random() * h;
    const rw = Math.random() * 3 + 1;
    const rh = Math.random() * 2 + 1;
    ctx.fillRect(rx, ry, rw, rh);
  }

  // 3. Intricate Guilloche / Engraved Borders
  ctx.strokeStyle = borderLineColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, w - 20, h - 20);

  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(16, 16, w - 32, h - 32);

  // Fine corner security rosettes
  ctx.save();
  const corners = [
    [24, 24],
    [w - 24, 24],
    [24, h - 24],
    [w - 24, h - 24],
  ];
  corners.forEach(([cx, cy]) => {
    ctx.strokeStyle = accentColor;
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.restore();

  // 4. Guilloche wave lines in the background
  ctx.save();
  ctx.strokeStyle = 'rgba(208, 197, 177, 0.12)';
  ctx.lineWidth = 0.8;
  for (let y = 30; y < h - 30; y += 14) {
    ctx.beginPath();
    for (let x = 20; x < w - 20; x += 10) {
      const wave = Math.sin(x * 0.05 + y * 0.1) * 3;
      if (x === 20) ctx.moveTo(x, y + wave);
      else ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }
  ctx.restore();

  // 5. Embedded Security Thread / Window Ribbon
  const ribbonX = type === 'inr' ? 140 : type === 'usd' ? 170 : 150;
  ctx.fillStyle = 'rgba(166, 139, 97, 0.35)';
  ctx.fillRect(ribbonX, 10, 12, h - 20);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 7px monospace';
  ctx.save();
  ctx.translate(ribbonX + 8, 30);
  ctx.rotate(Math.PI / 2);
  ctx.fillText('FINSURE FORENSIC • 100% SPECIMEN • SECURITY SEAL', 0, 0);
  ctx.restore();

  // 6. Watermark Oval / Portrait Zone
  const ovalX = type === 'inr' ? 380 : type === 'usd' ? 256 : 380;
  const ovalY = h / 2;
  ctx.save();
  ctx.strokeStyle = 'rgba(208, 197, 177, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(ovalX, ovalY, 48, 64, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Watermark emblem outline
  ctx.strokeStyle = 'rgba(166, 139, 97, 0.35)';
  ctx.beginPath();
  ctx.ellipse(ovalX, ovalY, 36, 48, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 7. Large Central / Prominent Denomination & Currency Art
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 36px "Cinzel", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(denomination, w / 2, h / 2 + 6);

  // Subtitle / Authority text
  ctx.fillStyle = textColor;
  ctx.font = '600 9px monospace';
  ctx.letterSpacing = '2px';
  ctx.fillText(subtitle, w / 2, h / 2 - 28);

  ctx.fillStyle = 'rgba(233, 227, 213, 0.7)';
  ctx.font = '500 8px monospace';
  ctx.fillText('LEGAL EVIDENCE SPECIMEN // NON-NEGOTIABLE FORENSIC BENCHMARK', w / 2, h / 2 + 36);

  // Corner Denomination Numerals
  ctx.font = 'bold 16px "Cinzel", Georgia, serif';
  ctx.fillStyle = accentColor;
  ctx.textAlign = 'left';
  ctx.fillText(denomination, 28, 42);
  ctx.fillText(denomination, 28, h - 30);
  ctx.textAlign = 'right';
  ctx.fillText(denomination, w - 28, 42);
  ctx.fillText(denomination, w - 28, h - 30);

  // Serial Number / Cryptographic Identification
  ctx.fillStyle = '#C27A4E';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('SER: 4FN-893021', 40, h - 42);
  ctx.textAlign = 'right';
  ctx.fillText('SHA: 7a09...ef21', w - 40, 42);

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

/**
 * Procedural Texture Generator for Financial Statement Documents
 */
function createStatementTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 680;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const w = canvas.width;
  const h = canvas.height;

  // Crisp Warm Ivory Paper Base
  ctx.fillStyle = '#E9E3D5';
  ctx.fillRect(0, 0, w, h);

  // Fine Paper Grain Noise
  ctx.fillStyle = 'rgba(41, 43, 40, 0.03)';
  for (let i = 0; i < 600; i++) {
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }

  // Formal Document Header
  ctx.strokeStyle = '#292B28';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(20, 20, w - 40, h - 40);
  ctx.strokeRect(24, 24, w - 48, h - 48);

  ctx.fillStyle = '#292B28';
  ctx.font = 'bold 16px "Cinzel", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('FINANCIAL AUDIT STATEMENT', w / 2, 54);

  ctx.font = '500 8px monospace';
  ctx.fillStyle = '#52534D';
  ctx.fillText('ACCREDITED LEDGER RECORD • VERIFICATION CYCLE 2026-Q4', w / 2, 68);

  // Horizontal Rule
  ctx.strokeStyle = '#77766B';
  ctx.lineWidth = 0.75;
  ctx.beginPath();
  ctx.moveTo(35, 80);
  ctx.lineTo(w - 35, 80);
  ctx.stroke();

  // Document Metadata Table
  ctx.font = '9px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#292B28';
  ctx.fillText('ACCOUNT: •••• 9812-INR', 40, 102);
  ctx.fillText('CURRENCY: MULTI-ASSET', 40, 118);
  ctx.textAlign = 'right';
  ctx.fillText('DATE: 28-OCT-2026', w - 40, 102);
  ctx.fillText('STATUS: AUDITED', w - 40, 118);

  // Ledger Table Grid
  const startY = 140;
  const rowHeight = 22;
  const rows = [
    ['DATE', 'PARTICULARS', 'DEBIT', 'CREDIT', 'BALANCE'],
    ['12-OCT', 'UPI / VENDOR-8419', '₹42,000.00', '—', '₹4,89,100'],
    ['15-OCT', 'RTGS / TREASURY INFLOW', '—', '₹1,50,000.00', '₹6,39,100'],
    ['19-OCT', 'FOREX SETTLEMENT EUR', '€12,500.00', '—', '₹5,26,600'],
    ['22-OCT', 'SWIFT WIRE USD TRF', '—', '$4,800.00', '₹9,22,400'],
    ['25-OCT', 'DOMESTIC CLEARING', '₹84,500.00', '—', '₹8,37,900'],
    ['28-OCT', 'LEDGER RECONCILED', '—', '₹15,000.00', '₹8,52,900'],
  ];

  rows.forEach((row, idx) => {
    const y = startY + idx * rowHeight;
    if (idx === 0) {
      ctx.fillStyle = '#D0C5B1';
      ctx.fillRect(35, y - 14, w - 70, rowHeight);
      ctx.fillStyle = '#292B28';
      ctx.font = 'bold 9px monospace';
    } else {
      ctx.fillStyle = idx % 2 === 0 ? 'rgba(208, 197, 177, 0.25)' : 'transparent';
      ctx.fillRect(35, y - 14, w - 70, rowHeight);
      ctx.fillStyle = '#292B28';
      ctx.font = '8px monospace';
    }

    ctx.textAlign = 'left';
    ctx.fillText(row[0], 42, y);
    ctx.fillText(row[1], 100, y);
    ctx.textAlign = 'right';
    ctx.fillText(row[2], 300, y);
    ctx.fillText(row[3], 380, y);
    ctx.fillText(row[4], w - 45, y);
  });

  // Stamp in Forest Green
  ctx.save();
  ctx.translate(w / 2, 440);
  ctx.rotate(-0.15);
  ctx.strokeStyle = '#456B58';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(-90, -25, 180, 50);
  ctx.fillStyle = '#456B58';
  ctx.font = 'bold 15px "Cinzel", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('VERIFIED AUDIT RECORD', 0, 0);
  ctx.font = 'bold 8px monospace';
  ctx.fillText('INSPECTION SEAL • FINSURE 2026', 0, 14);
  ctx.restore();

  // Barcode representation
  ctx.fillStyle = '#292B28';
  const bx = 45;
  const by = h - 70;
  for (let b = 0; b < 60; b++) {
    const bw = Math.random() > 0.4 ? 3 : 1.5;
    ctx.fillRect(bx + b * 5, by, bw, 32);
  }
  ctx.font = '7px monospace';
  ctx.fillText('*FINSURE-DOC-SHA256-VALIDATED*', bx, by + 42);

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  return texture;
}

/**
 * Procedural Texture Generator for Thermal POS Transaction Receipts
 */
function createReceiptTexture(refId: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 580;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const w = canvas.width;
  const h = canvas.height;

  // Crisp Stone / Paper Tint
  ctx.fillStyle = '#EDE8DC';
  ctx.fillRect(0, 0, w, h);

  // Thermal print font
  ctx.fillStyle = '#292B28';
  ctx.textAlign = 'center';
  ctx.font = 'bold 13px monospace';
  ctx.fillText('FINSURE FORENSIC POS', w / 2, 34);

  ctx.font = '8px monospace';
  ctx.fillText('TERMINAL ID: TRM-08914', w / 2, 48);
  ctx.fillText('MERCHANT: GLOBAL SETTLEMENT CORP', w / 2, 60);

  // Dotted line separator
  ctx.strokeStyle = '#77766B';
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(15, 75);
  ctx.lineTo(w - 15, 75);
  ctx.stroke();
  ctx.setLineDash([]);

  // Transaction Details
  ctx.textAlign = 'left';
  ctx.font = '8px monospace';
  ctx.fillText(`RECEIPT REF: ${refId}`, 20, 95);
  ctx.fillText('METHOD: UPI INSTANT SETTLEMENT', 20, 110);
  ctx.fillText('PAYEE: merchant.services@icici', 20, 125);
  ctx.fillText('TIME: 28-OCT-2026 23:14:02 IST', 20, 140);

  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(15, 155);
  ctx.lineTo(w - 15, 155);
  ctx.stroke();
  ctx.setLineDash([]);

  // Line items
  ctx.fillText('1x BATCH PROCESSING FEE', 20, 175);
  ctx.textAlign = 'right';
  ctx.fillText('₹71,610.17', w - 20, 175);

  ctx.textAlign = 'left';
  ctx.fillText('GST TAX @ 18%', 20, 195);
  ctx.textAlign = 'right';
  ctx.fillText('₹12,889.83', w - 20, 195);

  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(15, 215);
  ctx.lineTo(w - 15, 215);
  ctx.stroke();
  ctx.setLineDash([]);

  // Total
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('TOTAL SETTLED:', 20, 240);
  ctx.textAlign = 'right';
  ctx.fillText('₹84,500.00', w - 20, 240);

  // Status Box in Forest Green
  ctx.strokeStyle = '#456B58';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(20, 260, w - 40, 40);
  ctx.fillStyle = '#456B58';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('STATUS: PAYMENT CLAIM', w / 2, 282);
  ctx.font = '7px monospace';
  ctx.fillText('CROSS-CHECKED AGAINST LEDGER', w / 2, 292);

  // QR Code representation
  ctx.fillStyle = '#292B28';
  const qx = (w - 70) / 2;
  const qy = 330;
  for (let r = 0; r < 14; r++) {
    for (let c = 0; c < 14; c++) {
      if ((r + c) % 3 === 0 || (r < 3 && c < 3) || (r > 10 && c > 10)) {
        ctx.fillRect(qx + c * 5, qy + r * 5, 4, 4);
      }
    }
  }

  // Zig-zag bottom tear simulation
  ctx.fillStyle = '#1C1E1B';
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let z = 0; z < w; z += 12) {
    ctx.lineTo(z + 6, h - 8);
    ctx.lineTo(z + 12, h);
  }
  ctx.closePath();
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  return texture;
}

export const CurrencyHero3D: React.FC<CurrencyHero3DProps> = ({ className = '' }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Accessibility: check reduced motion preference
    const mediaMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaMotion.matches);
    const motionHandler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaMotion.addEventListener('change', motionHandler);

    // Screen size detection
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      mediaMotion.removeEventListener('change', motionHandler);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Dimensions
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 750;

    // 1. Three.js Scene, Camera, Renderer
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 16);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 2. Natural Ambient & Key Directional Lighting
    const ambientLight = new THREE.AmbientLight(0xE9E3D5, 0.85);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xFFF3DD, 1.25);
    keyLight.position.set(12, 18, 14);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xA68B61, 0.6);
    rimLight.position.set(-14, -8, 8);
    scene.add(rimLight);

    // 3. Texture Initialization
    const textures = {
      inr: createBanknoteTexture('inr'),
      usd: createBanknoteTexture('usd'),
      eur: createBanknoteTexture('eur'),
      gbp: createBanknoteTexture('gbp'),
      statement: createStatementTexture(),
      receipt1: createReceiptTexture('REC-882194'),
      receipt2: createReceiptTexture('VCH-994103'),
    };

    // Shared geometries with slight physical thickness / proportions
    const banknoteGeo = new THREE.PlaneGeometry(3.6, 1.8);
    const statementGeo = new THREE.PlaneGeometry(3.4, 4.6);
    const receiptGeo = new THREE.PlaneGeometry(1.6, 3.6);

    interface FloatingItem {
      mesh: THREE.Mesh;
      baseX: number;
      baseY: number;
      baseZ: number;
      rotX: number;
      rotY: number;
      rotZ: number;
      speed: number;
      phase: number;
      rotSpeed: number;
    }

    const floatingItems: FloatingItem[] = [];

    // Item Layout Specifications:
    // Placed strategically across the left, right, top, bottom, and depth
    // to envelop the hero environment without obstructing central text.
    const itemConfigs = [
      // Left Forefront: Indian Rupee (₹500)
      {
        geo: banknoteGeo,
        tex: textures.inr,
        pos: [-5.8, 1.8, 1.2],
        rot: [0.15, 0.35, -0.1],
        speed: 0.8,
        rotSpeed: 0.2,
      },
      // Right Forefront: US Dollar ($100)
      {
        geo: banknoteGeo,
        tex: textures.usd,
        pos: [5.6, 1.2, 0.8],
        rot: [-0.12, -0.4, 0.15],
        speed: 0.7,
        rotSpeed: -0.18,
      },
      // Right Mid-Depth: Bank Statement Document
      {
        geo: statementGeo,
        tex: textures.statement,
        pos: [6.4, -2.2, -1.8],
        rot: [0.2, -0.25, -0.12],
        speed: 0.6,
        rotSpeed: 0.15,
      },
      // Left Mid-Depth: Financial Audit Statement
      {
        geo: statementGeo,
        tex: textures.statement,
        pos: [-6.2, -2.4, -2.0],
        rot: [0.18, 0.3, 0.1],
        speed: 0.65,
        rotSpeed: -0.12,
      },
      // Left Upper Mid: Euro (€100)
      {
        geo: banknoteGeo,
        tex: textures.eur,
        pos: [-4.2, 3.4, -3.2],
        rot: [-0.2, 0.2, -0.25],
        speed: 0.9,
        rotSpeed: 0.22,
      },
      // Right Upper Mid: British Pound (£50)
      {
        geo: banknoteGeo,
        tex: textures.gbp,
        pos: [4.8, 3.2, -2.8],
        rot: [0.22, -0.3, 0.2],
        speed: 0.85,
        rotSpeed: -0.2,
      },
      // Left Lower Foreground: Thermal Transaction Receipt
      {
        geo: receiptGeo,
        tex: textures.receipt1,
        pos: [-3.8, -3.2, 1.5],
        rot: [-0.1, 0.2, 0.3],
        speed: 1.1,
        rotSpeed: 0.25,
      },
      // Right Lower Foreground: Thermal POS Slip
      {
        geo: receiptGeo,
        tex: textures.receipt2,
        pos: [3.6, -3.0, 1.4],
        rot: [0.12, -0.25, -0.25],
        speed: 1.0,
        rotSpeed: -0.22,
      },
      // Deep Background Atmosphere: Layered INR & USD
      {
        geo: banknoteGeo,
        tex: textures.inr,
        pos: [-2.5, 4.2, -6.5],
        rot: [0.3, 0.1, 0.05],
        speed: 0.5,
        rotSpeed: 0.1,
      },
      {
        geo: banknoteGeo,
        tex: textures.usd,
        pos: [2.8, 4.4, -6.8],
        rot: [-0.25, -0.15, -0.1],
        speed: 0.55,
        rotSpeed: -0.12,
      },
      {
        geo: banknoteGeo,
        tex: textures.eur,
        pos: [-6.8, 0.2, -5.5],
        rot: [0.1, 0.45, 0.2],
        speed: 0.6,
        rotSpeed: 0.15,
      },
      {
        geo: banknoteGeo,
        tex: textures.gbp,
        pos: [7.2, 0.4, -5.8],
        rot: [-0.15, -0.4, -0.18],
        speed: 0.58,
        rotSpeed: -0.14,
      },
    ];

    // On mobile, use a curated subset to guarantee 60fps and minimal memory footprint
    const activeConfigs = isMobile ? itemConfigs.slice(0, 6) : itemConfigs;

    activeConfigs.forEach((cfg, idx) => {
      const mat = new THREE.MeshStandardMaterial({
        map: cfg.tex,
        roughness: 0.72,
        metalness: 0.08,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(cfg.geo, mat);
      mesh.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
      mesh.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      floatingItems.push({
        mesh,
        baseX: cfg.pos[0],
        baseY: cfg.pos[1],
        baseZ: cfg.pos[2],
        rotX: cfg.rot[0],
        rotY: cfg.rot[1],
        rotZ: cfg.rot[2],
        speed: cfg.speed,
        phase: idx * 0.75,
        rotSpeed: cfg.rotSpeed,
      });
    });

    // 4. Subtle Mouse-Based Parallax
    let targetCamX = 0;
    let targetCamY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      if (prefersReducedMotion) return;
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;
      targetCamX = nx * 1.2;
      targetCamY = ny * 0.7;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // 5. Render Loop with Harmonic Drift
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();

      // Camera smooth damping
      if (!prefersReducedMotion) {
        camera.position.x += (targetCamX - camera.position.x) * 0.04;
        camera.position.y += (targetCamY - camera.position.y) * 0.04;
        camera.lookAt(0, 0, 0);
      }

      // Floating items subtle oscillation
      if (!prefersReducedMotion) {
        floatingItems.forEach((item) => {
          const t = elapsed * item.speed + item.phase;
          // Smooth sinusoidal floating
          item.mesh.position.y = item.baseY + Math.sin(t) * 0.22;
          item.mesh.position.x = item.baseX + Math.cos(t * 0.7) * 0.12;

          // Gentle rotational flutter
          item.mesh.rotation.x = item.rotX + Math.sin(t * 0.6) * 0.06;
          item.mesh.rotation.y = item.rotY + Math.cos(t * 0.5) * 0.08;
          item.mesh.rotation.z = item.rotZ + Math.sin(t * 0.4) * 0.04;
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    // 6. Responsive Resize Handling
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || 750;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // 7. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);

      floatingItems.forEach((item) => {
        scene.remove(item.mesh);
        (item.mesh.material as THREE.Material).dispose();
      });

      banknoteGeo.dispose();
      statementGeo.dispose();
      receiptGeo.dispose();

      Object.values(textures).forEach((tex) => tex.dispose());

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [prefersReducedMotion, isMobile]);

  return (
    <div
      ref={mountRef}
      className={`absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0 ${className}`}
      aria-label="3D Currency & Financial Documents Forensic Background"
      role="img"
    >
      {/* Translucent neutral overlay to maintain pristine contrast & readability for foreground hero text */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#1C1E1B]/95 via-[#1C1E1B]/80 to-[#1C1E1B]/90 pointer-events-none z-10" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#1C1E1B]/60 via-transparent to-[#1C1E1B] pointer-events-none z-10" />

      {/* Subtle Warm Amber / Gold Vignette (no neon glow) */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-radial from-[#A68B61]/8 to-transparent blur-3xl pointer-events-none z-10" />
    </div>
  );
};
