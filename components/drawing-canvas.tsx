"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Button } from "./ui/button"
import { Upload, Image as ImageIcon } from "lucide-react"
import { imageToDataURI } from "@/lib/meshy-api"

interface DrawingCanvasProps {
  brushSize: number
  brushColor: string
  activeTool: string
  canvasHistory: string[]
  historyIndex: number
  setCanvasHistory: (history: string[]) => void
  setHistoryIndex: (index: number) => void
  onImageSelected?: (dataUri: string) => void
}

export default function DrawingCanvas({
  brushSize,
  brushColor,
  activeTool,
  canvasHistory,
  historyIndex,
  setCanvasHistory,
  setHistoryIndex,
  onImageSelected,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })

  // Debug active tool changes
  useEffect(() => {
    console.log("Active tool changed:", activeTool);
  }, [activeTool]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size to match container
    const resizeCanvas = () => {
      const container = canvas.parentElement
      if (!container) return

      canvas.width = container.clientWidth
      canvas.height = container.clientHeight

      // Redraw canvas content after resize
      if (canvasHistory.length > 0 && historyIndex >= 0) {
        const img = new Image()
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(img, 0, 0)
        }
        img.src = canvasHistory[historyIndex]
      }
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Initialize history if empty
    if (canvasHistory.length === 0) {
      const initialState = canvas.toDataURL()
      setCanvasHistory([initialState])
      setHistoryIndex(0)
    }

    return () => {
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [canvasHistory, historyIndex, setCanvasHistory, setHistoryIndex])

  // Apply history changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    if (canvasHistory.length > 0 && historyIndex >= 0 && canvasHistory[historyIndex]) {
      const img = new Image()
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
      }
      img.src = canvasHistory[historyIndex]
    } else if (historyIndex === canvasHistory.length - 1 && canvasHistory[historyIndex] === "") {
      // Clear canvas if the current history state is empty
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [canvasHistory, historyIndex])

  // Flood fill implementation for paint bucket tool
  const floodFill = (
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    fillColor: string,
    tolerance: number = 30 // Higher tolerance for better results
  ) => {
    console.log("Starting flood fill at", x, y, "with color", fillColor);
    
    // Get the dimensions
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    
    // Get the pixel data
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Get the target color (the color we're replacing)
    const targetColor = getPixelColor(imageData, x, y);
    console.log("Target color:", targetColor);
    
    // Convert fill color to RGBA
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.fillStyle = fillColor;
    tempCtx.fillRect(0, 0, 1, 1);
    const fillRgba = tempCtx.getImageData(0, 0, 1, 1).data;
    console.log("Fill color:", Array.from(fillRgba));
    
    // If the target color is the same as the fill color, return
    const colorsSimilar = (
      Math.abs(targetColor[0] - fillRgba[0]) <= tolerance &&
      Math.abs(targetColor[1] - fillRgba[1]) <= tolerance &&
      Math.abs(targetColor[2] - fillRgba[2]) <= tolerance &&
      // Check if both alpha values are similar
      Math.abs(targetColor[3] - fillRgba[3]) <= tolerance
    );
    
    // Special handling for transparent pixels - if the target is transparent (alpha < 20),
    // we should still fill it regardless of color similarity
    const targetIsTransparent = targetColor[3] < 20;
    
    if (colorsSimilar && !targetIsTransparent) {
      console.log("Target color is already similar to fill color, skipping");
      return;
    }
    
    let pixelsFilled = 0;
    
    // Use a queue-based approach for the flood fill (more efficient than recursion)
    const queue: [number, number][] = [[x, y]];
    const visited = new Set<string>();
    visited.add(`${x},${y}`);
    
    while (queue.length > 0 && pixelsFilled < 1000000) { // Safety limit
      const [currentX, currentY] = queue.shift()!;
      const positionIndex = (currentY * width + currentX) * 4;
      
      // Set the color
      data[positionIndex] = fillRgba[0];     // Red
      data[positionIndex + 1] = fillRgba[1]; // Green
      data[positionIndex + 2] = fillRgba[2]; // Blue
      data[positionIndex + 3] = 255;         // Full alpha
      
      pixelsFilled++;
      
      // Check neighboring pixels (4-directional)
      const directions = [
        [1, 0], [-1, 0], [0, 1], [0, -1]
      ];
      
      for (const [dx, dy] of directions) {
        const newX = currentX + dx;
        const newY = currentY + dy;
        const key = `${newX},${newY}`;
        
        // Check bounds
        if (
          newX >= 0 && newX < width && 
          newY >= 0 && newY < height && 
          !visited.has(key)
        ) {
          const newColor = getPixelColor(imageData, newX, newY);
          
          // Skip if the pixel is black or very dark (like a border line)
          if (
            newColor[0] < 40 && 
            newColor[1] < 40 && 
            newColor[2] < 40 && 
            newColor[3] > 128 // Only if it's somewhat opaque
          ) {
            visited.add(key); // Mark as visited to avoid checking again
            continue;
          }
          
          // Check if the color is similar to the target color (with tolerance)
          const isColorSimilar = (
            Math.abs(newColor[0] - targetColor[0]) <= tolerance &&
            Math.abs(newColor[1] - targetColor[1]) <= tolerance &&
            Math.abs(newColor[2] - targetColor[2]) <= tolerance &&
            Math.abs(newColor[3] - targetColor[3]) <= Math.max(tolerance, 128) // More tolerance for alpha
          );
          
          if (isColorSimilar) {
            visited.add(key);
            queue.push([newX, newY]);
          }
        }
      }
    }
    
    console.log(`Flood fill complete. Filled ${pixelsFilled} pixels.`);
    
    // Put the modified image data back on the canvas
    ctx.putImageData(imageData, 0, 0);
  }
  
  // Helper to get pixel color at a specific position
  const getPixelColor = (imageData: ImageData, x: number, y: number): [number, number, number, number] => {
    const index = (y * imageData.width + x) * 4;
    return [
      imageData.data[index],     // Red
      imageData.data[index + 1], // Green
      imageData.data[index + 2], // Blue
      imageData.data[index + 3]  // Alpha
    ];
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    setIsDrawing(true)

    // Get mouse/touch position
    let clientX: number, clientY: number

    if ("touches" in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top

    setStartPos({ x, y })

    // If using paint bucket, do the fill immediately on click
    if (activeTool === "bucket") {
      console.log("Bucket tool selected, executing flood fill");
      
      // Force pixel coordinates to integers
      const pixelX = Math.floor(x);
      const pixelY = Math.floor(y);
      
      console.log(`Filling at canvas coordinates (${pixelX}, ${pixelY})`);
      floodFill(ctx, pixelX, pixelY, brushColor);
      console.log("Flood fill executed");
      
      // Save the state after fill
      const newState = canvas.toDataURL();
      const newHistory = canvasHistory.slice(0, historyIndex + 1);
      setCanvasHistory([...newHistory, newState]);
      setHistoryIndex(newHistory.length);
      
      // Notify parent that image changed
      if (onImageSelected) {
        onImageSelected(newState);
      }
      
      // Don't continue with isDrawing set to true
      setIsDrawing(false);
      return;
    }

    if (activeTool === "pencil" || activeTool === "eraser") {
      ctx.beginPath()
      ctx.moveTo(x, y)

      // Set drawing styles
      ctx.lineWidth = brushSize
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      if (activeTool === "eraser") {
        ctx.globalCompositeOperation = "destination-out"
      } else {
        ctx.globalCompositeOperation = "source-over"
        ctx.strokeStyle = brushColor
      }
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Get mouse/touch position
    let clientX: number, clientY: number

    if ("touches" in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY

      // Prevent scrolling while drawing on touch devices
      e.preventDefault()
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top

    if (activeTool === "pencil" || activeTool === "eraser") {
      ctx.lineTo(x, y)
      ctx.stroke()
    } else if (activeTool === "square" || activeTool === "circle") {
      // For shape preview, we'll redraw from the history
      const img = new Image()
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)

        // Set drawing styles
        ctx.lineWidth = brushSize
        ctx.strokeStyle = brushColor
        ctx.fillStyle = brushColor

        const width = x - startPos.x
        const height = y - startPos.y

        if (activeTool === "square") {
          ctx.beginPath()
          ctx.rect(startPos.x, startPos.y, width, height)
          ctx.stroke()
        } else if (activeTool === "circle") {
          ctx.beginPath()
          // Calculate radius for the circle based on width and height
          const radius = Math.sqrt(width * width + height * height)
          ctx.arc(startPos.x, startPos.y, radius, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      if (canvasHistory.length > 0 && historyIndex >= 0) {
        img.src = canvasHistory[historyIndex]
      }
    }
  }

  const endDrawing = () => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    setIsDrawing(false)

    // Reset composite operation
    ctx.globalCompositeOperation = "source-over"

    // For shapes, the final shape is already drawn in the preview (draw method)
    // so we just need to save the current state to history
    // No need to redraw the shape here as it causes duplication
    
    // Save to history
    const newState = canvas.toDataURL()
    const newHistory = canvasHistory.slice(0, historyIndex + 1)
    setCanvasHistory([...newHistory, newState])
    setHistoryIndex(newHistory.length)
    
    // Notify parent that image changed
    if (onImageSelected) {
      onImageSelected(newState);
    }
  }
  
  // Handle image import
  const handleImageImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        
        // Calculate aspect ratio to fit image in canvas
        const canvasRatio = canvas.width / canvas.height
        const imgRatio = img.width / img.height
        
        let drawWidth, drawHeight, offsetX = 0, offsetY = 0
        
        if (imgRatio > canvasRatio) {
          // Image is wider than canvas
          drawWidth = canvas.width
          drawHeight = canvas.width / imgRatio
          offsetY = (canvas.height - drawHeight) / 2
        } else {
          // Image is taller than canvas
          drawHeight = canvas.height
          drawWidth = canvas.height * imgRatio
          offsetX = (canvas.width - drawWidth) / 2
        }
        
        // Draw the image centered in canvas
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)
        
        // Save to history
        const newState = canvas.toDataURL()
        const newHistory = canvasHistory.slice(0, historyIndex + 1)
        setCanvasHistory([...newHistory, newState])
        setHistoryIndex(newHistory.length)
        
        // Notify parent that image changed
        if (onImageSelected) {
          onImageSelected(newState);
        }
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }
  
  // Expose current canvas image to parent
  const getCurrentCanvasImage = (): string => {
    const canvas = canvasRef.current
    if (!canvas) return ''
    
    return imageToDataURI(canvas)
  }

  // Expose method to get current canvas image 
  useEffect(() => {
    if (onImageSelected) {
      const canvas = canvasRef.current
      if (canvas && canvasHistory.length > 0 && historyIndex >= 0) {
        onImageSelected(canvasHistory[historyIndex])
      }
    }
  }, [])

  return (
    <div className="h-full w-full relative bg-white dark:bg-black/20">
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full cursor-crosshair"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={endDrawing}
      />
      
      {/* Image import controls */}
      <div className="absolute top-2 right-2 flex flex-col gap-2">
        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden" 
          accept="image/*" 
          onChange={handleImageImport}
        />
        <Button 
          variant="secondary" 
          size="sm" 
          className="rounded-full h-8 w-8 p-0 bg-white/80 dark:bg-black/50 image-upload"
          onClick={() => fileInputRef.current?.click()}
          title="Import Image"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

