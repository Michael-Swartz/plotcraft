'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { exportToSVG } from '../../lib/exportSVG'

interface Cell {
  x: number
  y: number
  walls: {
    top: boolean
    right: boolean
    bottom: boolean
    left: boolean
  }
  visited: boolean
  visitedForSolution?: boolean
  parent?: Cell | null
}

interface Point { x: number; y: number }

type Grid = Cell[][]

const MAZE_BASE_SIZE = 500 // Used as the basis for the longer dimension

const commonAspectRatios = {
  '1:1': 1 / 1,
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  '4:3': 4 / 3,
  '3:4': 3 / 4,
  '3:2': 3 / 2,
  '2:3': 2 / 3,
};

type AspectRatioKey = keyof typeof commonAspectRatios;

export default function MazeGeneratorPage() {
  const [density, setDensity] = useState(10)
  const [grid, setGrid] = useState<Grid>([])
  const [solutionPath, setSolutionPath] = useState<Point[]>([])
  const [showSolution, setShowSolution] = useState(true)
  const [aspectRatio, setAspectRatio] = useState<AspectRatioKey>('1:1');
  const [mazeDisplayWidth, setMazeDisplayWidth] = useState(MAZE_BASE_SIZE);
  const [mazeDisplayHeight, setMazeDisplayHeight] = useState(MAZE_BASE_SIZE);

  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const ratio = commonAspectRatios[aspectRatio];
    if (ratio >= 1) { // Landscape or square
      setMazeDisplayWidth(MAZE_BASE_SIZE);
      setMazeDisplayHeight(MAZE_BASE_SIZE / ratio);
    } else { // Portrait
      setMazeDisplayHeight(MAZE_BASE_SIZE);
      setMazeDisplayWidth(MAZE_BASE_SIZE * ratio);
    }
  }, [aspectRatio]);

  const initializeGrid = useCallback((size: number): Grid => {
    const newGrid: Grid = []
    for (let y = 0; y < size; y++) {
      newGrid[y] = []
      for (let x = 0; x < size; x++) {
        newGrid[y][x] = {
          x,
          y,
          walls: { top: true, right: true, bottom: true, left: true },
          visited: false,
          visitedForSolution: false,
          parent: null,
        }
      }
    }
    return newGrid
  }, [])

  const getUnvisitedNeighbors = useCallback((cell: Cell, currentGrid: Grid, size: number) => {
    const neighbors: Cell[] = []
    const { x, y } = cell

    // Top
    if (y > 0 && !currentGrid[y - 1][x].visited) {
      neighbors.push(currentGrid[y - 1][x])
    }
    // Right
    if (x < size - 1 && !currentGrid[y][x + 1].visited) {
      neighbors.push(currentGrid[y][x + 1])
    }
    // Bottom
    if (y < size - 1 && !currentGrid[y + 1][x].visited) {
      neighbors.push(currentGrid[y + 1][x])
    }
    // Left
    if (x > 0 && !currentGrid[y][x - 1].visited) {
      neighbors.push(currentGrid[y][x - 1])
    }
    return neighbors
  }, [])

  const removeWall = (current: Cell, next: Cell) => {
    const dx = current.x - next.x
    if (dx === 1) { // next is to the left
      current.walls.left = false
      next.walls.right = false
    } else if (dx === -1) { // next is to the right
      current.walls.right = false
      next.walls.left = false
    }
    const dy = current.y - next.y
    if (dy === 1) { // next is above
      current.walls.top = false
      next.walls.bottom = false
    } else if (dy === -1) { // next is below
      current.walls.bottom = false
      next.walls.top = false
    }
  }

  const recursiveBacktracker = useCallback((size: number): Grid => {
    const newGrid = initializeGrid(size)
    const stack: Cell[] = []
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        newGrid[y][x].visited = false
        newGrid[y][x].visitedForSolution = false
        newGrid[y][x].parent = null
      }
    }

    let currentCell = newGrid[0][0]
    currentCell.visited = true

    do {
      const unvisitedNeighbors = getUnvisitedNeighbors(currentCell, newGrid, size)
      if (unvisitedNeighbors.length > 0) {
        const randomIndex = Math.floor(Math.random() * unvisitedNeighbors.length)
        const nextCell = unvisitedNeighbors[randomIndex]
        stack.push(currentCell)
        removeWall(currentCell, nextCell)
        currentCell = nextCell
        currentCell.visited = true
      } else if (stack.length > 0) {
        currentCell = stack.pop()!
      }
    } while (stack.length > 0 || getUnvisitedNeighbors(currentCell, newGrid, size).length > 0)
    if (stack.length === 0 && getUnvisitedNeighbors(currentCell, newGrid, size).length === 0) {
    }

    return newGrid
  }, [initializeGrid, getUnvisitedNeighbors])

  const findSolutionPath = useCallback((currentGrid: Grid, startCell: Cell, endCell: Cell): Point[] => {
    if (!currentGrid.length) return []

    const size = currentGrid.length
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        currentGrid[y][x].visitedForSolution = false
        currentGrid[y][x].parent = null
      }
    }

    const q: Cell[] = []
    startCell.visitedForSolution = true
    q.push(startCell)

    let solutionFound = false
    while (q.length > 0) {
      const current = q.shift()!

      if (current.x === endCell.x && current.y === endCell.y) {
        solutionFound = true
        break
      }

      const { x, y, walls } = current
      const neighbors: Cell[] = [] 

      if (y > 0 && !walls.top && !currentGrid[y - 1][x].visitedForSolution) {
        neighbors.push(currentGrid[y - 1][x])
      }
      if (x < size - 1 && !walls.right && !currentGrid[y][x + 1].visitedForSolution) {
        neighbors.push(currentGrid[y][x + 1])
      }
      if (y < size - 1 && !walls.bottom && !currentGrid[y + 1][x].visitedForSolution) {
        neighbors.push(currentGrid[y + 1][x])
      }
      if (x > 0 && !walls.left && !currentGrid[y][x - 1].visitedForSolution) {
        neighbors.push(currentGrid[y][x - 1])
      }

      for (const neighbor of neighbors) {
        neighbor.visitedForSolution = true
        neighbor.parent = current
        q.push(neighbor)
      }
    }

    const path: Point[] = []
    if (solutionFound) {
      let curr = endCell
      while (curr.parent) {
        path.push({ x: curr.x, y: curr.y })
        curr = curr.parent
      }
      path.push({ x: startCell.x, y: startCell.y })
      return path.reverse()
    }
    return []

  }, [])

  const drawMaze = useCallback((currentGrid: Grid, svgElement: SVGSVGElement, currentSolutionPath: Point[], shouldShowSolution: boolean, width: number, height: number) => {
    while (svgElement.firstChild) {
      svgElement.removeChild(svgElement.firstChild)
    }

    if (currentGrid.length === 0) return

    const bgRectSvg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRectSvg.setAttribute('width', width.toString());
    bgRectSvg.setAttribute('height', height.toString());
    bgRectSvg.setAttribute('fill', '#FFFFFF');
    svgElement.appendChild(bgRectSvg);

    const size = currentGrid.length // density
    const cellSizeX = width / size;
    const cellSizeY = height / size;
    const wallThickness = Math.max(1, Math.min(cellSizeX, cellSizeY) / 10);

    const pathData: string[] = []

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cell = currentGrid[y][x]
        const xPos = x * cellSizeX
        const yPos = y * cellSizeY

        if (cell.walls.top) {
          pathData.push(`M ${xPos} ${yPos} L ${xPos + cellSizeX} ${yPos}`)
        }
        if (cell.walls.right) {
          pathData.push(`M ${xPos + cellSizeX} ${yPos} L ${xPos + cellSizeX} ${yPos + cellSizeY}`)
        }
        if (cell.walls.bottom) {
          pathData.push(`M ${xPos + cellSizeX} ${yPos + cellSizeY} L ${xPos} ${yPos + cellSizeY}`)
        }
        if (cell.walls.left) {
          pathData.push(`M ${xPos} ${yPos + cellSizeY} L ${xPos} ${yPos}`)
        }
      }
    }
    
    pathData.push(`M 0 0 L ${width} 0`);                         // Top border
    pathData.push(`M ${width} 0 L ${width} ${height}`);       // Right border
    pathData.push(`M ${width} ${height} L 0 ${height}`);     // Bottom border
    pathData.push(`M 0 ${height} L 0 0`);                     // Left border

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', pathData.join(' '))
    path.setAttribute('stroke', '#000000') // Black walls
    path.setAttribute('stroke-width', wallThickness.toString())
    path.setAttribute('stroke-linecap', 'square')
    path.setAttribute('fill', 'none')
    svgElement.appendChild(path)

    const startMarkerRadius = Math.min(cellSizeX, cellSizeY) * 0.25;
    const endMarkerRadius = Math.min(cellSizeX, cellSizeY) * 0.25;

    const startCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    startCircle.setAttribute('cx', (0.5 * cellSizeX).toString());
    startCircle.setAttribute('cy', (0.5 * cellSizeY).toString());
    startCircle.setAttribute('r', startMarkerRadius.toString());
    startCircle.setAttribute('fill', '#000000') // Black marker for visibility on white background
    svgElement.appendChild(startCircle)

    const endCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    endCircle.setAttribute('cx', ((size - 0.5) * cellSizeX).toString());
    endCircle.setAttribute('cy', ((size - 0.5) * cellSizeY).toString());
    endCircle.setAttribute('r', endMarkerRadius.toString());
    endCircle.setAttribute('fill', '#000000') // Black marker for visibility on white background
    svgElement.appendChild(endCircle)

    if (shouldShowSolution && currentSolutionPath.length > 0) {
      const solutionPathData: string[] = [];
      for (let i = 0; i < currentSolutionPath.length; i++) {
        const point = currentSolutionPath[i];
        const xPos = (point.x + 0.5) * cellSizeX;
        const yPos = (point.y + 0.5) * cellSizeY;
        if (i === 0) {
          solutionPathData.push(`M ${xPos} ${yPos}`);
        } else {
          solutionPathData.push(`L ${xPos} ${yPos}`);
        }
      }

      const solutionLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      solutionLine.setAttribute('d', solutionPathData.join(' '));
      solutionLine.setAttribute('stroke', '#FF0000');
      solutionLine.setAttribute('stroke-width', (Math.min(cellSizeX, cellSizeY) / 15).toString());
      solutionLine.setAttribute('stroke-linecap', 'round');
      solutionLine.setAttribute('stroke-linejoin', 'round');
      solutionLine.setAttribute('fill', 'none');
      svgElement.appendChild(solutionLine);
    }
  }, [])

  const generateAndDrawMaze = useCallback(() => {
    console.log('Generating maze with density:', density, 'AspectRatio:', aspectRatio)
    const newGrid = recursiveBacktracker(density)
    setGrid(newGrid)

    let path: Point[] = []
    if (newGrid.length > 0) {
      const startNode = newGrid[0][0]
      const endNode = newGrid[density - 1][density - 1]
      path = findSolutionPath(newGrid, startNode, endNode)
      setSolutionPath(path)
    } else {
      setSolutionPath([])
    }

    if (svgRef.current) {
      drawMaze(newGrid, svgRef.current, path, showSolution, mazeDisplayWidth, mazeDisplayHeight)
    }
  }, [density, recursiveBacktracker, drawMaze, findSolutionPath, showSolution, aspectRatio, mazeDisplayWidth, mazeDisplayHeight])

  const handleExportSVG = () => {
    if (svgRef.current) {
      const tempSvg = svgRef.current.cloneNode(true) as SVGSVGElement;
      // Ensure the cloned SVG also has the correct explicit width and height for export consistency
      tempSvg.setAttribute('width', mazeDisplayWidth.toString());
      tempSvg.setAttribute('height', mazeDisplayHeight.toString());

      const bgRectExport = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bgRectExport.setAttribute('width', mazeDisplayWidth.toString());
      bgRectExport.setAttribute('height', mazeDisplayHeight.toString());
      bgRectExport.setAttribute('fill', '#FFFFFF'); 
      tempSvg.insertBefore(bgRectExport, tempSvg.firstChild);
      exportToSVG(tempSvg, `maze_D${density}_${aspectRatio.replace(':', 'x')}.svg`)
    }
  }

  useEffect(() => {
    if (grid.length > 0 && svgRef.current) {
      drawMaze(grid, svgRef.current, solutionPath, showSolution, mazeDisplayWidth, mazeDisplayHeight)
    }
  }, [grid, solutionPath, showSolution, drawMaze, mazeDisplayWidth, mazeDisplayHeight])

  useEffect(() => {
    generateAndDrawMaze()
  }, [density, recursiveBacktracker, initializeGrid, getUnvisitedNeighbors, findSolutionPath, aspectRatio, mazeDisplayWidth, mazeDisplayHeight])

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 md:p-8 flex flex-col items-center text-white">
      <div className="w-full max-w-5xl flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-1/3 bg-slate-800 p-6 rounded-xl shadow-xl">
          <h2 className="text-3xl font-bold mb-6 text-sky-400">Maze Controls</h2>

          <div className="space-y-6">
            <div>
              <label htmlFor="density" className="block text-sm font-medium text-slate-300 mb-1">
                Maze Density (Cells: {density}x{density})
              </label>
              <Slider
                id="density"
                min={3}
                max={100}
                step={1}
                value={[density]}
                onValueChange={(value) => setDensity(value[0])}
                className="[&>span:first-child]:h-1 [&>span:first-child]:bg-sky-500"
              />
              <p className="text-xs text-slate-400 mt-1 text-right">{density}x{density} cells</p>
            </div>

            {/* Aspect Ratio Dropdown */}
            <div>
              <label htmlFor="aspectRatio" className="block text-sm font-medium text-slate-300 mb-1">
                Aspect Ratio
              </label>
              <select
                id="aspectRatio"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as AspectRatioKey)}
                className="w-full p-2.5 bg-slate-700 border border-slate-600 text-white text-sm rounded-lg focus:ring-sky-500 focus:border-sky-500 block"
              >
                {Object.keys(commonAspectRatios).map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="showSolution"
                checked={showSolution}
                onChange={(e) => setShowSolution(e.target.checked)}
                className="form-checkbox h-5 w-5 text-sky-500 bg-slate-700 border-slate-600 rounded focus:ring-sky-600 cursor-pointer"
              />
              <label
                htmlFor="showSolution"
                className="text-sm font-medium text-slate-300 cursor-pointer"
              >
                Show Solution Path
              </label>
            </div>

            <Button
              onClick={generateAndDrawMaze}
              className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold py-3 rounded-lg transition duration-150"
            >
              Generate Maze
            </Button>
          </div>
        </div>

        <div className="w-full md:w-2/3 bg-slate-800 p-6 rounded-xl shadow-xl flex flex-col items-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight self-start">
            Maze Generator
          </h1>
          {/* Container for SVG - removed aspect-square, height will be determined by SVG content via viewBox */}
          <div className="w-full max-w-[500px] bg-slate-900 rounded-lg overflow-hidden shadow-inner" style={{ height: mazeDisplayHeight / mazeDisplayWidth * ( // maintain aspect ratio of the container based on svg internal ratio (this will make it fit nicely)
            svgRef.current?.clientWidth || MAZE_BASE_SIZE // use actual width if available, fallback to base size
          ) }}> 
            <svg
              ref={svgRef}
              viewBox={`0 0 ${mazeDisplayWidth} ${mazeDisplayHeight}`}
              width="100%" // Make SVG take full width of its container
              height="100%" // Make SVG take full height of its container
              className="w-full h-full"
            >
            </svg>
          </div>
          <Button
            onClick={handleExportSVG}
            className="mt-6 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition duration-150"
          >
            Export as SVG
          </Button>
        </div>
      </div>
    </main>
  )
}
