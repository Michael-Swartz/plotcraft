'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import p5 from 'p5'

const Sketch = dynamic(() => import('react-p5'), { ssr: false })
import type P5Instance from 'p5'

interface MountainParameters {
  gridSizeX: number;
  gridSizeZ: number;
  gridResolutionX: number;
  gridResolutionZ: number;
  mountainHeightScale: number;
  noiseScale: number;
  noiseDetailLod: number;
  noiseDetailFalloff: number;
  strokeWeight: number;
  initialRotationX: number;
  initialRotationY: number;
  initialRotationZ: number;
}

interface LineSegment3D {
  v1: P5Instance.Vector;
  v2: P5Instance.Vector;
}

export default function MountainGeneratorPage() {
  const [params, setParams] = useState<MountainParameters>({
    gridSizeX: 700,
    gridSizeZ: 700,
    gridResolutionX: 35,
    gridResolutionZ: 35,
    mountainHeightScale: 200,
    noiseScale: 0.04,
    noiseDetailLod: 4,
    noiseDetailFalloff: 0.35,
    strokeWeight: 0.8,
    initialRotationX: 55,
    initialRotationY: 0,
    initialRotationZ: -40,
  });
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 10000));

  const p5Instance = useRef<P5Instance | null>(null);
  const lineSegmentsCache = useRef<LineSegment3D[]>([]);
  const canvasSize = { width: 800, height: 600 };

  const handleParamChange = (paramName: keyof MountainParameters, value: number) => {
    setParams(prev => ({ ...prev, [paramName]: value }));
  };

  const setup = (p5Setup: P5Instance, canvasParentRef: Element) => {
    p5Instance.current = p5Setup;
    p5Setup.createCanvas(canvasSize.width, canvasSize.height, p5Setup.WEBGL).parent(canvasParentRef);
    p5Setup.noiseSeed(seed);
    p5Setup.noLoop();
  };

  const generateMountainMeshLines = (p5: P5Instance, currentParams: MountainParameters, currentSeed: number): LineSegment3D[] => {
    const lines: LineSegment3D[] = [];
    const {
      gridSizeX, gridSizeZ, gridResolutionX, gridResolutionZ,
      mountainHeightScale, noiseScale, noiseDetailLod, noiseDetailFalloff
    } = currentParams;

    p5.noiseDetail(noiseDetailLod, noiseDetailFalloff);

    const cellWidth = gridSizeX / gridResolutionX;
    const cellDepth = gridSizeZ / gridResolutionZ;

    const points: (P5Instance.Vector)[][] = Array(gridResolutionZ + 1)
      .fill(null!)
      .map(() => Array(gridResolutionX + 1).fill(null!));

    for (let i = 0; i <= gridResolutionZ; i++) {
      for (let j = 0; j <= gridResolutionX; j++) {
        const x = (j * cellWidth) - (gridSizeX / 2);
        const z = (i * cellDepth) - (gridSizeZ / 2);
        
        const noiseX = (x + currentSeed * 100.7) * noiseScale; // Use currentSeed for unique terrain
        const noiseZ = (z + currentSeed * 100.7) * noiseScale; // Different multiplier for variety
        const noiseVal = p5.noise(noiseX, noiseZ);
        const y = (noiseVal - 0.25) * mountainHeightScale; // Center noise somewhat and apply scale
        
        points[i][j] = p5.createVector(x, y, z);
      }
    }

    for (let i = 0; i <= gridResolutionZ; i++) {
      for (let j = 0; j <= gridResolutionX; j++) {
        if (j < gridResolutionX && points[i][j] && points[i][j+1]) {
          lines.push({ v1: points[i][j], v2: points[i][j+1] });
        }
        if (i < gridResolutionZ && points[i][j] && points[i+1]?.[j]) {
          lines.push({ v1: points[i][j], v2: points[i+1][j] });
        }
      }
    }
    return lines;
  };

  const draw = useCallback((p5: P5Instance) => {
    if (!p5) return;
    p5.background(255);
    p5.stroke(0);
    p5.strokeWeight(params.strokeWeight);
    p5.noFill();

    p5.push(); // Isolate camera and transformations
    p5.rotateX(p5.radians(params.initialRotationX));
    p5.rotateY(p5.radians(params.initialRotationY));
    p5.rotateZ(p5.radians(params.initialRotationZ));
    
    // Center the view on the terrain, adjust as needed
    // For a grid centered at (0,y,0) and initial rotations, orbitControl default might be fine
    p5.orbitControl(2, 2, 0.05); // Slower zoom sensitivity

    lineSegmentsCache.current = generateMountainMeshLines(p5, params, seed);

    for (const seg of lineSegmentsCache.current) {
      if (seg.v1 && seg.v2) {
          p5.line(seg.v1.x, seg.v1.y, seg.v1.z, seg.v2.x, seg.v2.y, seg.v2.z);
      }
    }
    p5.pop(); // Restore transformation matrix
  }, [params, seed]);

  useEffect(() => {
    if (p5Instance.current) {
      p5Instance.current.noiseSeed(seed); // Update noiseSeed when seed changes
      p5Instance.current.redraw();
    }
  }, [params, seed]); // Redraw if params or seed change

  const regenerate = () => {
    setSeed(Math.floor(Math.random() * 10000));
  };

  const project3DTo2D = (p5_main: P5Instance, point3D: P5Instance.Vector): { x: number, y: number, z: number } | null => {
    // @ts-ignore 
    if (!p5_main || !p5_main._renderer || !p5_main._renderer.uPMatrix || !p5_main._renderer.uMVMatrix) {
      console.error("P5.js WebGL renderer internal matrices not found for SVG export.");
      return null;
    }
    // @ts-ignore
    const projMatrix = p5_main._renderer.uPMatrix;
    // @ts-ignore
    const mvMatrix = p5_main._renderer.uMVMatrix;

    const pointVec4 = [point3D.x, point3D.y, point3D.z, 1.0];
    const eyePos = new Array(4);
    const clipPos = new Array(4);

    // Simplified matrix multiplication
    // Eye Position = ModelViewMatrix * Point
    for (let i = 0; i < 4; i++) {
      eyePos[i] = 0;
      for (let j = 0; j < 4; j++) {
        eyePos[i] += mvMatrix.mat4[j * 4 + i] * pointVec4[j];
      }
    }
    
    // Clip Position = ProjectionMatrix * EyePosition
    for (let i = 0; i < 4; i++) {
      clipPos[i] = 0;
      for (let j = 0; j < 4; j++) {
        clipPos[i] += projMatrix.mat4[j * 4 + i] * eyePos[j];
      }
    }

    if (clipPos[3] === 0) return null;

    const ndcX = clipPos[0] / clipPos[3];
    const ndcY = clipPos[1] / clipPos[3];
    const ndcZ = clipPos[2] / clipPos[3];

    const screenX = (ndcX + 1) / 2 * canvasSize.width;
    const screenY = (1 - ndcY) / 2 * canvasSize.height;

    return { x: screenX, y: screenY, z: ndcZ };
  };

  const exportSVG = () => {
    const mainP5Instance = p5Instance.current;
    if (!mainP5Instance || lineSegmentsCache.current.length === 0) {
        console.error("P5 instance or line data not available for SVG export.");
        return;
    }
    
    // Redraw to ensure camera matrices are current, especially after orbitControl interaction
    if (mainP5Instance.isLooping()) mainP5Instance.noLoop(); // Ensure noLoop for consistent matrix capture
    mainP5Instance.redraw(); 


    let svgOutput = `<svg width="${canvasSize.width}" height="${canvasSize.height}" xmlns="http://www.w3.org/2000/svg" style="background-color: white;">
  <g stroke="black" stroke-width="${params.strokeWeight.toFixed(2)}" fill="none">`;

    let linesDrawn = 0;
    for (const seg of lineSegmentsCache.current) {
      if (seg.v1 && seg.v2) {
        // Project points using the current main canvas's camera state
        const p1_2D = project3DTo2D(mainP5Instance, seg.v1);
        const p2_2D = project3DTo2D(mainP5Instance, seg.v2);

        if (p1_2D && p2_2D) {
          // Basic clipping (slightly more generous than strict canvas bounds)
          const nearClipBuffer = Math.max(canvasSize.width, canvasSize.height) * 0.5; // Generous buffer
          const isP1Visible = p1_2D.x >= -nearClipBuffer && p1_2D.x <= canvasSize.width + nearClipBuffer && 
                              p1_2D.y >= -nearClipBuffer && p1_2D.y <= canvasSize.height + nearClipBuffer;
          const isP2Visible = p2_2D.x >= -nearClipBuffer && p2_2D.x <= canvasSize.width + nearClipBuffer && 
                              p2_2D.y >= -nearClipBuffer && p2_2D.y <= canvasSize.height + nearClipBuffer;
          
          if (p1_2D.z < 1 && p2_2D.z < 1 && (isP1Visible || isP2Visible)) {
            svgOutput += `\n    <line x1="${p1_2D.x.toFixed(2)}" y1="${p1_2D.y.toFixed(2)}" x2="${p2_2D.x.toFixed(2)}" y2="${p2_2D.y.toFixed(2)}"/>`;
            linesDrawn++;
          }
        }
      }
    }
    console.log("SVG Export: Lines available:", lineSegmentsCache.current.length, "Lines drawn:", linesDrawn);
    if (linesDrawn === 0 && lineSegmentsCache.current.length > 0) {
        console.warn("SVG Export Warning: No lines were drawn. Check projection, camera, or clipping.")
    }

    svgOutput += '\n  </g>\n</svg>';

    const blob = new Blob([svgOutput], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mountain-terrain-${seed}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-100 flex flex-col items-center">
      <div className="w-full max-w-6xl bg-white shadow-xl p-4 md:p-8 rounded-lg">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center text-gray-700">Wireframe Mountain Generator</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="md:col-span-3">
            <div className="border border-gray-300 rounded-md overflow-hidden aspect-[4/3] shadow-inner bg-white">
              {/* @ts-ignore p5 types can be tricky with dynamic import */}
              <Sketch setup={setup} draw={draw} />
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1 block">Grid Size X ({params.gridSizeX})</p>
              <Slider value={[params.gridSizeX]} onValueChange={v => handleParamChange('gridSizeX', v[0])} min={100} max={1500} step={10} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1 block">Grid Size Z ({params.gridSizeZ})</p>
              <Slider value={[params.gridSizeZ]} onValueChange={v => handleParamChange('gridSizeZ', v[0])} min={100} max={1500} step={10} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1 block">Grid Resolution X ({params.gridResolutionX})</p>
              <Slider value={[params.gridResolutionX]} onValueChange={v => handleParamChange('gridResolutionX', v[0])} min={5} max={100} step={1} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1 block">Grid Resolution Z ({params.gridResolutionZ})</p>
              <Slider value={[params.gridResolutionZ]} onValueChange={v => handleParamChange('gridResolutionZ', v[0])} min={5} max={100} step={1} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1 block">Height Scale ({params.mountainHeightScale})</p>
              <Slider value={[params.mountainHeightScale]} onValueChange={v => handleParamChange('mountainHeightScale', v[0])} min={10} max={800} step={10} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1 block">Noise Scale ({params.noiseScale.toFixed(3)})</p>
              <Slider value={[params.noiseScale]} onValueChange={v => handleParamChange('noiseScale', v[0])} min={0.001} max={0.25} step={0.001} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1 block">Noise LOD ({params.noiseDetailLod})</p>
              <Slider value={[params.noiseDetailLod]} onValueChange={v => handleParamChange('noiseDetailLod', v[0])} min={1} max={12} step={1} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1 block">Noise Falloff ({params.noiseDetailFalloff.toFixed(2)})</p>
              <Slider value={[params.noiseDetailFalloff]} onValueChange={v => handleParamChange('noiseDetailFalloff', v[0])} min={0.1} max={0.9} step={0.01} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1 block">Stroke Weight ({params.strokeWeight.toFixed(1)})</p>
              <Slider value={[params.strokeWeight]} onValueChange={v => handleParamChange('strokeWeight', v[0])} min={0.1} max={5} step={0.1} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1 block">Rotation X ({params.initialRotationX}°)</p>
              <Slider value={[params.initialRotationX]} onValueChange={v => handleParamChange('initialRotationX', v[0])} min={-180} max={180} step={1} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1 block">Rotation Y ({params.initialRotationY}°)</p>
              <Slider value={[params.initialRotationY]} onValueChange={v => handleParamChange('initialRotationY', v[0])} min={-180} max={180} step={1} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1 block">Rotation Z ({params.initialRotationZ}°)</p>
              <Slider value={[params.initialRotationZ]} onValueChange={v => handleParamChange('initialRotationZ', v[0])} min={-180} max={180} step={1} />
            </div>
            <Button onClick={regenerate} className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md shadow-sm transition duration-150">
              Regenerate (New Seed)
            </Button>
             <Button onClick={() => p5Instance.current?.redraw()} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-md shadow-sm transition duration-150 mt-2">
              Redraw
            </Button>
            <Button onClick={exportSVG} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-md shadow-sm transition duration-150 mt-2">
              Export as SVG
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
} 