"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { 
  Circle, 
  Eraser, 
  Maximize2, 
  Minimize2, 
  Palette, 
  Pencil, 
  Redo2, 
  Save, 
  Square, 
  Trash2, 
  Undo2,
  Loader2,
  Upload,
  UploadCloud,
  Box,
  Download,
  Droplet
} from "lucide-react"
import DrawingCanvas from "@/components/drawing-canvas"
import ModelViewer from "@/components/model-viewer"
import { ThemeToggle } from "@/components/theme-toggle"
import { createMeshyTask, checkMeshyTaskStatus, MeshyTaskResponse } from "@/lib/meshy-api"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"
import { AppTour } from "@/components/app-tour"
import { HelpButton } from "@/components/help-button"

export default function Home() {
  const [brushSize, setBrushSize] = useState(5)
  const [brushColor, setBrushColor] = useState("#000000")
  const [activeTool, setActiveTool] = useState("pencil")
  const [canvasHistory, setCanvasHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [fullscreenPanel, setFullscreenPanel] = useState<string | null>(null)
  
  // Meshy API integration
  const [isGenerating3D, setIsGenerating3D] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [modelUrl, setModelUrl] = useState<string | null>(null)
  const [currentImageData, setCurrentImageData] = useState<string | null>(null)
  const [checkAttempts, setCheckAttempts] = useState(0)
  const { toast } = useToast()

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
    }
  }

  const handleRedo = () => {
    if (historyIndex < canvasHistory.length - 1) {
      setHistoryIndex(historyIndex + 1)
    }
  }

  const handleClear = () => {
    const confirmed = window.confirm("Are you sure you want to clear the canvas?")
    if (confirmed) {
      // Canvas clearing logic will be handled in the DrawingCanvas component
      setCanvasHistory([...canvasHistory, ""])
      setHistoryIndex(canvasHistory.length)
      
      // Also clear the 3D model
      setModelUrl(null)
      setTaskId(null)
      setIsGenerating3D(false)
      setGenerationProgress(0)
      
      toast({
        title: "Canvas cleared",
        description: "Drawing canvas and 3D model have been cleared."
      })
    }
  }

  const toggleFullscreen = (panel: string) => {
    if (fullscreenPanel === panel) {
      setFullscreenPanel(null)
    } else {
      setFullscreenPanel(panel)
    }
  }
  
  // Handle receiving image from DrawingCanvas
  const handleImageSelected = (dataUri: string) => {
    setCurrentImageData(dataUri)
  }
  
  // Handle generate 3D model button click
  const handleGenerateModel = async () => {
    if (isGenerating3D || !currentImageData) return;
    
    try {
      // Check if API key is configured
      if (!process.env.NEXT_PUBLIC_MESHY_API_KEY) {
        toast({
          title: "Configuration Error",
          description: "Meshy API key is not configured. Please add NEXT_PUBLIC_MESHY_API_KEY to your .env.local file.",
          variant: "destructive",
        });
        return;
      }
      
      setIsGenerating3D(true);
      setGenerationProgress(0);
      setUploadStatus("Uploading image to S3...");
      
      toast({
        title: "Starting 3D generation",
        description: "Uploading image to storage...",
      });
      
      // Create a task in Meshy API (this now includes S3 upload)
      const id = await createMeshyTask(currentImageData);
      setTaskId(id);
      
      setUploadStatus(null);
      setGenerationProgress(10);
      
      toast({
        title: "Upload complete",
        description: "Image uploaded successfully. Now generating 3D model...",
      });
    } catch (error) {
      console.error("Error starting 3D generation:", error);
      
      let errorMessage = "Failed to start 3D generation. Please try again.";
      
      // More specific error messages
      if (error instanceof Error) {
        if (error.message.includes("API key")) {
          errorMessage = "Meshy API key is not configured or invalid. Please check your .env.local file.";
        } else if (error.message.includes("S3") || error.message.includes("Credential")) {
          errorMessage = "Failed to upload image to storage. Please try again.";
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      setIsGenerating3D(false);
      setUploadStatus(null);
    }
  };
  
  // Handle download model button click
  const handleDownloadModel = async () => {
    if (!modelUrl) return;
    
    try {
      toast({
        title: "Downloading model",
        description: "Preparing model file for download..."
      });
      
      // Use the model URL (which should already be proxied)
      const response = await fetch(modelUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
      }
      
      // Get the model as a blob
      const blob = await response.blob();
      
      // Create a download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'generated-3d-model.glb';
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download complete",
        description: "Your 3D model has been downloaded successfully."
      });
    } catch (error) {
      console.error('Error downloading model:', error);
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  };
  
  // Poll for task status
  useEffect(() => {
    if (!taskId || !isGenerating3D) return;
    
    const checkTaskStatus = async () => {
      try {
        const taskStatus = await checkMeshyTaskStatus(taskId);
        console.log("Current task status:", taskStatus);
        
        // Check if we have actual progress info from the API
        if (taskStatus.result?.progress !== undefined) {
          // Use the actual progress from the API
          setGenerationProgress(taskStatus.result.progress);
        } else {
          // Fallback to status-based progress if no explicit progress info
          if (taskStatus.status === "pending" || taskStatus.status === "PENDING") {
            setGenerationProgress(25);
          } else if (
            taskStatus.status === "processing" || 
            taskStatus.status === "IN_PROGRESS"
          ) {
            setGenerationProgress(50);
          } else if (
            taskStatus.status === "success" || 
            taskStatus.status === "completed" ||
            taskStatus.status === "SUCCEEDED"
          ) {
            setGenerationProgress(100);
          }
        }
        
        // Check if task is complete
        if (
          taskStatus.status === "success" || 
          taskStatus.status === "completed" ||
          taskStatus.status === "SUCCEEDED"
        ) {
          setIsGenerating3D(false);
          
          // Get the model URL
          let modelUrlValue = null;
          
          // Check different possible locations for the model URL
          if (taskStatus.result?.model_url) {
            modelUrlValue = taskStatus.result.model_url;
          } else if (taskStatus.result?.model) {
            modelUrlValue = taskStatus.result.model;
          } else if (taskStatus.result?.model_urls?.glb) {
            modelUrlValue = taskStatus.result.model_urls.glb;
          } else if (taskStatus.model_url) {
            modelUrlValue = taskStatus.model_url;
          } else if (taskStatus.model) {
            modelUrlValue = taskStatus.model;
          } else if (taskStatus.model_urls?.glb) {
            modelUrlValue = taskStatus.model_urls.glb;
          }
          
          if (modelUrlValue) {
            console.log("Model URL found:", modelUrlValue);
            setModelUrl(modelUrlValue);
            toast({
              title: "Success!",
              description: "Your 3D model is ready to view.",
            });
          } else {
            console.error("No model URL found in response:", taskStatus);
            toast({
              title: "Warning",
              description: "Model generated but URL not found in the response.",
              variant: "destructive",
            });
          }
        } else if (
          taskStatus.status === "failed" || 
          taskStatus.status === "error" ||
          taskStatus.status === "FAILED"
        ) {
          setIsGenerating3D(false);
          toast({
            title: "Generation failed",
            description: "Failed to generate 3D model. Please try again with a different image.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error checking task status:", error);
        // If there's an error checking status, increment attempts
        // After several failed attempts, abandon the process
        setCheckAttempts(prev => {
          const newAttempts = prev + 1;
          if (newAttempts > 10) {
            setIsGenerating3D(false);
            toast({
              title: "Error",
              description: "Failed to check model generation status after multiple attempts.",
              variant: "destructive",
            });
          }
          return newAttempts;
        });
      }
    };
    
    // Poll every 5 seconds
    const interval = setInterval(checkTaskStatus, 5000);
    
    // Clean up interval
    return () => clearInterval(interval);
  }, [taskId, isGenerating3D, toast]);

  return (
    <AppTour>
      <main className="flex flex-col h-screen bg-background">
        <header className="flex items-center justify-between p-4 border-b">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            DesignVision 3D
          </h1>
          <div className="flex items-center gap-4">
            <HelpButton />
            <ThemeToggle />
            <Button variant="outline" size="sm" asChild>
              <Link href="/test-models">Show Tests</Link>
            </Button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Drawing Panel */}
          <div
            className={`flex flex-col border-r drawing-panel ${
              fullscreenPanel === "3d" ? "hidden" : fullscreenPanel === "drawing" ? "flex-1" : "w-1/2"
            }`}
          >
            <div className="flex items-center justify-between p-2 border-b bg-muted/30">
              <h2 className="text-lg font-medium">Drawing Canvas</h2>
              <Button variant="ghost" size="icon" onClick={() => toggleFullscreen("drawing")}>
                {fullscreenPanel === "drawing" ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>

            <div className="flex-1 overflow-hidden">
              <DrawingCanvas
                brushSize={brushSize}
                brushColor={brushColor}
                activeTool={activeTool}
                canvasHistory={canvasHistory}
                historyIndex={historyIndex}
                setCanvasHistory={setCanvasHistory}
                setHistoryIndex={setHistoryIndex}
                onImageSelected={handleImageSelected}
              />
            </div>

            <div className="p-2 border-t bg-muted/30">
              <div className="flex items-center justify-between mb-2 drawing-tools">
                <div className="flex items-center gap-1">
                  <Button
                    variant={activeTool === "pencil" ? "default" : "ghost"}
                    size="icon"
                    onClick={() => setActiveTool("pencil")}
                    title="Pencil"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={activeTool === "eraser" ? "default" : "ghost"}
                    size="icon"
                    onClick={() => setActiveTool("eraser")}
                    title="Eraser"
                  >
                    <Eraser className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={activeTool === "square" ? "default" : "ghost"}
                    size="icon"
                    onClick={() => setActiveTool("square")}
                    title="Square"
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={activeTool === "circle" ? "default" : "ghost"}
                    size="icon"
                    onClick={() => setActiveTool("circle")}
                    title="Circle"
                  >
                    <Circle className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={activeTool === "bucket" ? "default" : "ghost"}
                    size="icon"
                    onClick={() => {
                      console.log("Paint bucket button clicked, changing active tool to bucket");
                      setActiveTool("bucket");
                      console.log("Active tool is now:", "bucket");
                    }}
                    title="Paint Bucket"
                  >
                    <Droplet className="h-4 w-4" />
                  </Button>
                  <div className="relative">
                    <Button variant="ghost" size="icon" className="overflow-hidden" title="Color Picker">
                      <Palette className="h-4 w-4" />
                      <input
                        type="color"
                        value={brushColor}
                        onChange={(e) => setBrushColor(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={handleUndo} disabled={historyIndex <= 0} title="Undo">
                    <Undo2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRedo}
                    disabled={historyIndex >= canvasHistory.length - 1}
                    title="Redo"
                  >
                    <Redo2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleClear} title="Clear Canvas">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Save Drawing">
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs">Size:</span>
                <Slider
                  value={[brushSize]}
                  min={1}
                  max={50}
                  step={1}
                  onValueChange={(value) => setBrushSize(value[0])}
                  className="w-32"
                />
                <span className="text-xs w-6">{brushSize}px</span>
              </div>
            </div>
          </div>

          {/* 3D Model Panel */}
          <div
            className={`flex flex-col model-panel ${
              fullscreenPanel === "drawing" ? "hidden" : fullscreenPanel === "3d" ? "flex-1" : "w-1/2"
            }`}
          >
            <div className="flex items-center justify-between p-2 border-b bg-muted/30">
              <h2 className="text-lg font-medium">3D Model Viewer</h2>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleDownloadModel}
                  disabled={!modelUrl}
                  title="Download 3D Model"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => toggleFullscreen("3d")}>
                  {fullscreenPanel === "3d" ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <Tabs defaultValue="model" className="h-full flex flex-col">
                <div className="px-4 pt-2 flex justify-between items-center">
                  <TabsList>
                    <TabsTrigger value="model">Model</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                  </TabsList>
                  
                  <Button 
                    className="gap-2 generate-button" 
                    disabled={isGenerating3D || !currentImageData}
                    onClick={handleGenerateModel}
                  >
                    {isGenerating3D ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Box className="h-4 w-4" />
                    )}
                    Generate Model Now
                  </Button>
                </div>

                <TabsContent value="model" className="flex-1 mt-0">
                  <div className="h-full w-full bg-black/5 dark:bg-white/5 rounded-md overflow-hidden relative">
                    {isGenerating3D && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm z-10">
                        {uploadStatus ? (
                          <>
                            <UploadCloud className="h-10 w-10 mb-4 text-primary animate-bounce" />
                            <div className="text-lg font-medium">{uploadStatus}</div>
                          </>
                        ) : (
                          <>
                            <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary" />
                            <div className="text-lg font-medium">Generating 3D Model...</div>
                            <div className="w-64 h-2 bg-muted mt-4 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary" 
                                style={{ width: `${generationProgress}%` }}
                              />
                            </div>
                            <div className="text-sm mt-2">{generationProgress}% complete</div>
                          </>
                        )}
                      </div>
                    )}
                    
                    {!modelUrl && !isGenerating3D && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/10 backdrop-blur-sm z-5">
                        <Box className="h-16 w-16 mb-4 text-muted-foreground opacity-40" />
                        <div className="text-lg font-medium text-muted-foreground">No 3D Model Generated Yet</div>
                        <div className="text-sm mt-2 text-muted-foreground max-w-md text-center">
                          Draw or import an image, then click the "Generate Model Now" button above to create a 3D model.
                        </div>
                      </div>
                    )}
                    
                    <ModelViewer key={modelUrl || 'empty'} modelUrl={modelUrl || undefined} />
                  </div>
                </TabsContent>

                <TabsContent value="settings" className="p-4 mt-0">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Environment</h3>
                      <select className="w-full p-2 rounded-md border bg-background">
                        <option value="studio">Studio</option>
                        <option value="sunset">Sunset</option>
                        <option value="dawn">Dawn</option>
                        <option value="night">Night</option>
                        <option value="warehouse">Warehouse</option>
                        <option value="forest">Forest</option>
                        <option value="apartment">Apartment</option>
                        <option value="city">City</option>
                      </select>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-sm font-medium mb-2">Camera Controls</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs">Auto Rotate</span>
                          <input type="checkbox" className="toggle" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs">Zoom Speed</span>
                          <Slider value={[1]} min={0.1} max={2} step={0.1} className="w-32" />
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>
    </AppTour>
  )
}

