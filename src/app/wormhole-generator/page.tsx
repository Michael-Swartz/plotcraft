'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'

const Sketch = dynamic(() => import('react-p5'), { ssr: false })
import type P5Instance from 'p5'

interface WormholeParameters {
  gridDensityU: number;
  gridDensityV: number;
  mouthRadius1: number; // Replaces mouthRadius
  mouthRadius2: number; // New
  throatRadius: number;
  throatPosition: number; // New: 0 to 1
  length: number;
  profileExponent: number; // New
  strokeWeight: number;
  initialRotationX: number; // Degrees
  initialRotationY: number; // Degrees
  initialRotationZ: number; // Degrees
}

// Store 3D line segments for drawing and SVG export
interface LineSegment3D {
  v1: P5Instance.Vector;
  v2: P5Instance.Vector;
}

export default function WormholeGeneratorPage() {
  const [params, setParams] = useState<WormholeParameters>({
    gridDensityU: 24,
    gridDensityV: 30,
    mouthRadius1: 150,
    mouthRadius2: 120,
    throatRadius: 50,
    throatPosition: 0.5,
    length: 400,
    profileExponent: 1.5,
    strokeWeight: 1,
    initialRotationX: 30,
    initialRotationY: -30,
    initialRotationZ: 0,
  });
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 10000));

  const p5Instance = useRef<P5Instance | null>(null);
  const lineSegmentsCache = useRef<LineSegment3D[]>([]);
  const canvasSize = { width: 800, height: 600 };

  const handleParamChange = (paramName: keyof WormholeParameters, value: number) => {
    setParams(prev => ({ ...prev, [paramName]: value }));
  };

  const setup = (p5Setup: P5Instance, canvasParentRef: Element) => {
    p5Instance.current = p5Setup;
    p5Setup.createCanvas(canvasSize.width, canvasSize.height, p5Setup.WEBGL).parent(canvasParentRef);
    p5Setup.randomSeed(seed);
    p5Setup.noiseSeed(seed);
    p5Setup.noLoop(); // Redraw on param change
  };

  // Generates a hyperboloid-like shape
  const generateHyperboloidLines = (p5: P5Instance, currentParams: WormholeParameters): LineSegment3D[] => {
    const lines: LineSegment3D[] = [];
    const { 
      gridDensityU, gridDensityV, 
      mouthRadius1, mouthRadius2, throatRadius, throatPosition,
      length, profileExponent 
    } = currentParams;

    const points: P5Instance.Vector[][] = Array(gridDensityV + 1).fill(null).map(() => Array(gridDensityU).fill(null));

    for (let i = 0; i <= gridDensityV; i++) {
      const v = i / gridDensityV; // Normalized value from 0 to 1 along length
      const z = (-length / 2) + v * length;
      
      const currentReferenceMouthRadius = v < throatPosition ? mouthRadius1 : mouthRadius2;
      
      let t_profile: number; // Ensure t_profile is declared as number
      if (throatPosition === 0 && v === 0) { // Edge case: throat at start
        t_profile = 0;
      } else if (throatPosition === 1 && v === 1) { // Edge case: throat at end
        t_profile = 0;
      } else if (v <= throatPosition) {
        t_profile = throatPosition === 0 ? 0 : 1 - (v / throatPosition); // Avoid division by zero if throat is at start
      } else { // v > throatPosition
        t_profile = throatPosition === 1 ? 0 : (v - throatPosition) / (1 - throatPosition); // Avoid division by zero if throat is at end
      }
      t_profile = Math.min(1, Math.max(0, t_profile));
      
      const currentRadius = throatRadius + (currentReferenceMouthRadius - throatRadius) * Math.pow(t_profile, profileExponent);

      for (let j = 0; j < gridDensityU; j++) {
        const u = j / gridDensityU;
        const angle = u * p5.TWO_PI;
        const x = currentRadius * p5.cos(angle);
        const y = currentRadius * p5.sin(angle);
        points[i][j] = p5.createVector(x, y, z);
      }
    }

    for (let i = 0; i < gridDensityV; i++) {
      for (let j = 0; j < gridDensityU; j++) {
        const nextJ = (j + 1) % gridDensityU;
        if(points[i][j] && points[i+1]?.[j]) lines.push({ v1: points[i][j], v2: points[i+1][j] });
        if(points[i][j] && points[i][nextJ]) lines.push({ v1: points[i][j], v2: points[i][nextJ] });
      }
    }
    if (gridDensityV > 0) {
        for (let j = 0; j < gridDensityU; j++) {
            const nextJ = (j + 1) % gridDensityU;
            if(points[gridDensityV][j] && points[gridDensityV][nextJ]) {
                lines.push({ v1: points[gridDensityV][j], v2: points[gridDensityV][nextJ] });
            }
        }
    }
    return lines;
  };

  const draw = useCallback((p5: P5Instance) => {
    if (!p5) return;
    p5.background(255); // White background
    p5.stroke(0); // Black lines
    p5.strokeWeight(params.strokeWeight);
    p5.noFill();

    // Apply initial static rotations
    p5.rotateX(p5.radians(params.initialRotationX));
    p5.rotateY(p5.radians(params.initialRotationY));
    p5.rotateZ(p5.radians(params.initialRotationZ));
    
    p5.orbitControl(2, 2, 0.1); // Orbit control after initial rotation

    lineSegmentsCache.current = generateHyperboloidLines(p5, params);

    for (const seg of lineSegmentsCache.current) {
      if (seg.v1 && seg.v2) { // Ensure vectors are not null
          p5.line(seg.v1.x, seg.v1.y, seg.v1.z, seg.v2.x, seg.v2.y, seg.v2.z);
      }
    }
  }, [params]);

  useEffect(() => {
    if (p5Instance.current) {
      p5Instance.current.redraw();
    }
  }, [draw]);

  const regenerate = () => {
    setSeed(Math.floor(Math.random() * 10000));
  };

  // Function to manually project a 3D point to 2D screen coordinates
  // This replicates what p5.screenX/Y do for the main WEBGL canvas
  const project3DTo2D = (p5_main: P5Instance, point3D: P5Instance.Vector): { x: number, y: number, z: number } | null => {
    // @ts-expect-error Accessing internal _renderer property and its sub-properties
    if (!p5_main._renderer || !p5_main._renderer.uPMatrix || !p5_main._renderer.uMVMatrix) {
      console.error("P5.js WebGL renderer internal matrices (uPMatrix or uMVMatrix) not found.");
      return null;
    }
    // @ts-expect-error Accessing internal _renderer.uPMatrix property
    const projMatrix = p5_main._renderer.uPMatrix;
    // @ts-expect-error Accessing internal _renderer.uMVMatrix property
    const mvMatrix = p5_main._renderer.uMVMatrix;

    const point4D = [point3D.x, point3D.y, point3D.z, 1.0];

    // Transform by ModelView matrix: World -> Camera
    const eyePos = [
      mvMatrix.mat4[0]*point4D[0] + mvMatrix.mat4[4]*point4D[1] + mvMatrix.mat4[8]*point4D[2] + mvMatrix.mat4[12]*point4D[3],
      mvMatrix.mat4[1]*point4D[0] + mvMatrix.mat4[5]*point4D[1] + mvMatrix.mat4[9]*point4D[2] + mvMatrix.mat4[13]*point4D[3],
      mvMatrix.mat4[2]*point4D[0] + mvMatrix.mat4[6]*point4D[1] + mvMatrix.mat4[10]*point4D[2] + mvMatrix.mat4[14]*point4D[3],
      mvMatrix.mat4[3]*point4D[0] + mvMatrix.mat4[7]*point4D[1] + mvMatrix.mat4[11]*point4D[2] + mvMatrix.mat4[15]*point4D[3]
    ];

    // Transform by Projection matrix: Camera -> Clip
    const clipPos = [
      projMatrix.mat4[0]*eyePos[0] + projMatrix.mat4[4]*eyePos[1] + projMatrix.mat4[8]*eyePos[2] + projMatrix.mat4[12]*eyePos[3],
      projMatrix.mat4[1]*eyePos[0] + projMatrix.mat4[5]*eyePos[1] + projMatrix.mat4[9]*eyePos[2] + projMatrix.mat4[13]*eyePos[3],
      projMatrix.mat4[2]*eyePos[0] + projMatrix.mat4[6]*eyePos[1] + projMatrix.mat4[10]*eyePos[2] + projMatrix.mat4[14]*eyePos[3],
      projMatrix.mat4[3]*eyePos[0] + projMatrix.mat4[7]*eyePos[1] + projMatrix.mat4[11]*eyePos[2] + projMatrix.mat4[15]*eyePos[3]
    ];

    if (clipPos[3] === 0) return null; // Avoid division by zero

    // Perspective divide: Clip -> NDC (Normalized Device Coordinates)
    const ndcX = clipPos[0] / clipPos[3];
    const ndcY = clipPos[1] / clipPos[3];
    const ndcZ = clipPos[2] / clipPos[3]; // z can be used for depth sorting if needed

    // Convert NDC to screen coordinates (0,0 at top-left)
    const screenX = (ndcX + 1) / 2 * canvasSize.width;
    const screenY = (1 - ndcY) / 2 * canvasSize.height; // Y is inverted

    return { x: screenX, y: screenY, z: ndcZ };
  };

  const exportSVG = () => {
    const mainP5Instance = p5Instance.current;
    if (!mainP5Instance || lineSegmentsCache.current.length === 0) {
        console.error("P5 instance or line data not available for SVG export.");
        return;
    }

    // Ensure the main p5 draw cycle has completed and camera matrices are up-to-date
    // This is a bit of a hack; ideally, we'd have a more robust way to ensure this.
    // Calling redraw and then hoping it's done before we grab matrices.
    if (mainP5Instance.isLooping()) mainP5Instance.noLoop();
    mainP5Instance.redraw(); // Force a redraw to update camera matrices if params changed

    let svgOutput = `<svg width="${canvasSize.width}" height="${canvasSize.height}" xmlns="http://www.w3.org/2000/svg" style="background-color: white;">
  <g stroke="black" stroke-width="${params.strokeWeight}" fill="none">`;

    let linesDrawn = 0;
    for (const seg of lineSegmentsCache.current) {
      if (seg.v1 && seg.v2) {
        const p1_2D = project3DTo2D(mainP5Instance, seg.v1);
        const p2_2D = project3DTo2D(mainP5Instance, seg.v2);

        if (p1_2D && p2_2D) {
          // Basic clipping: check if projected points are roughly within viewport bounds
          // This is a very basic form of clipping. True line clipping is more complex.
          const isP1Visible = p1_2D.x >= -canvasSize.width*0.5 && p1_2D.x <= canvasSize.width*1.5 && p1_2D.y >= -canvasSize.height*0.5 && p1_2D.y <= canvasSize.height*1.5;
          const isP2Visible = p2_2D.x >= -canvasSize.width*0.5 && p2_2D.x <= canvasSize.width*1.5 && p2_2D.y >= -canvasSize.height*0.5 && p2_2D.y <= canvasSize.height*1.5;
          
          // Only draw line if both projected points have Z < 1 (in front of near clip plane)
          // and at least one end is somewhat near the canvas (generous bounds for now)
          if (p1_2D.z < 1 && p2_2D.z < 1 && (isP1Visible || isP2Visible)) {
            svgOutput += `\n    <line x1="${p1_2D.x.toFixed(2)}" y1="${p1_2D.y.toFixed(2)}" x2="${p2_2D.x.toFixed(2)}" y2="${p2_2D.y.toFixed(2)}"/>`;
            linesDrawn++;
          }
        }
      }
    }
    console.log("SVG Export: Lines processed for SVG:", lineSegmentsCache.current.length, "Lines drawn in SVG:", linesDrawn);
    if (linesDrawn === 0 && lineSegmentsCache.current.length > 0) {
        console.warn("SVG Export Warning: No lines were drawn. Check projection, clipping, or camera setup.")
    }

    svgOutput += '\n  </g>\n</svg>';

    const blob = new Blob([svgOutput], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wormhole-${seed}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-100 flex flex-col items-center">
      <div className="w-full max-w-6xl bg-white shadow-xl p-4 md:p-8 rounded-lg">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center text-gray-700">Wireframe Wormhole Generator</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="md:col-span-3">
            <div className="border border-gray-300 rounded-md overflow-hidden aspect-[4/3] shadow-inner">
              {/* @ts-expect-error TODO: Fix p5 type incompatibility if it arises */}
              <Sketch setup={setup} draw={draw} />
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1 block">Grid Density U ({params.gridDensityU})</p>
              <Slider value={[params.gridDensityU]} onValueChange={v => handleParamChange('gridDensityU', v[0])} min={4} max={80} step={1} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1 block">Grid Density V ({params.gridDensityV})</p>
              <Slider value={[params.gridDensityV]} onValueChange={v => handleParamChange('gridDensityV', v[0])} min={4} max={100} step={1} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1 block">Mouth Radius 1 ({params.mouthRadius1})</p>
              <Slider value={[params.mouthRadius1]} onValueChange={v => handleParamChange('mouthRadius1', v[0])} min={10} max={400} step={5} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1 block">Mouth Radius 2 ({params.mouthRadius2})</p>
              <Slider value={[params.mouthRadius2]} onValueChange={v => handleParamChange('mouthRadius2', v[0])} min={10} max={400} step={5} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1 block">Throat Radius ({params.throatRadius})</p>
              <Slider value={[params.throatRadius]} onValueChange={v => handleParamChange('throatRadius', v[0])} min={5} max={300} step={5} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1 block">Throat Position ({params.throatPosition.toFixed(2)})</p>
              <Slider value={[params.throatPosition]} onValueChange={v => handleParamChange('throatPosition', v[0])} min={0.01} max={0.99} step={0.01} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1 block">Length ({params.length})</p>
              <Slider value={[params.length]} onValueChange={v => handleParamChange('length', v[0])} min={50} max={1000} step={10} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1 block">Profile Exponent ({params.profileExponent.toFixed(2)})</p>
              <Slider value={[params.profileExponent]} onValueChange={v => handleParamChange('profileExponent', v[0])} min={0.25} max={5} step={0.05} />
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