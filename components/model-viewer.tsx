"use client"

import { useRef, useState, useEffect, Suspense } from "react"
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber"
import { Environment, OrbitControls, PresentationControls, useProgress, Html, Box } from "@react-three/drei"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import type { Mesh } from "three"
import { Loader2 } from "lucide-react"
import * as THREE from "three"
import { useToast } from "@/components/ui/use-toast"

function Loader() {
  const { progress } = useProgress()
  return (
    <Html center>
      <div className="flex flex-col items-center justify-center text-primary">
        <Loader2 className="w-8 h-8 mb-2 animate-spin" />
        <span className="text-sm">{progress.toFixed(0)}% loaded</span>
      </div>
    </Html>
  )
}

// Simple placeholder mesh when no model is loaded
function PlaceholderModel() {
  return (
    <Html center>
      <div className="text-center text-sm text-muted-foreground">
        {/* <p>No 3D model loaded</p>
        <p className="mt-2 text-xs opacity-70">Draw an image and click "Generate Model Now"</p> */}
      </div>
    </Html>
  )
}

interface ModelProps {
  url: string
  onError?: (error: Error) => void
}

function Model({ url, onError }: ModelProps) {
  const [modelError, setModelError] = useState(false)
  const [loadingModel, setLoadingModel] = useState(true)
  const progressRef = useRef(0)
  const loadingRef = useRef(true)
  const meshRef = useRef<Mesh>(null)
  const { camera } = useThree()
  
  useEffect(() => {
    // Reset state when URL changes
    setModelError(false)
    setLoadingModel(true)
    progressRef.current = 0
    loadingRef.current = true
    console.log("Attempting to load model from URL:", url)
  }, [url])
  
  // Handle progress updates without throwing errors
  const handleProgress = (event: ProgressEvent<EventTarget>) => {
    if (!loadingRef.current || modelError) return;
    
    // This avoids console spamming for progress events
    if (event.loaded && event.total) {
      progressRef.current = Math.round((event.loaded / event.total) * 100);
      
      // Don't log every progress event to avoid console spam
      if (progressRef.current % 25 === 0) {
        console.log(`Loading model progress: ${progressRef.current}%`);
      }
    }
  };
  
  // Use a state to track if GLTF loading is in progress to handle errors better
  const [gltfLoading, setGltfLoading] = useState(true);
  
  // Custom loader logic to better handle errors with the model
  const [gltf, setGltf] = useState<any>(null);
  
  useEffect(() => {
    if (!url) return;
    
    let isMounted = true;
    setGltfLoading(true);
    
    const loader = new GLTFLoader();
    // Configure loader settings
    loader.setRequestHeader({
      'Accept': '*/*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Origin': 'https://app.meshy.ai',
      'Referer': 'https://app.meshy.ai/'
    });
    
    console.log("Starting manual GLTFLoader for:", url);
    
    // Load the model
    loader.load(
      url,
      // Success callback
      (loadedGltf) => {
        if (!isMounted) return;
        console.log("GLTF loaded successfully");
        setGltf(loadedGltf);
        setGltfLoading(false);
        setLoadingModel(false);
        loadingRef.current = false;
      },
      // Progress callback
      (event) => {
        if (!isMounted) return;
        if (event.loaded && event.total) {
          progressRef.current = Math.round((event.loaded / event.total) * 100);
          if (progressRef.current % 25 === 0) {
            console.log(`Manual loading progress: ${progressRef.current}%`);
          }
        }
      },
      // Error callback
      (error) => {
        if (!isMounted) return;
        console.error("Error loading GLTF model:", error);
        setModelError(true);
        setGltfLoading(false);
        setLoadingModel(false);
        loadingRef.current = false;
        
        if (onError) {
          try {
            // Handle error objects that may not have a message property
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            if (typeof errorMsg === 'string' && (
              errorMsg.includes("blocked by CORS policy") || 
              errorMsg.includes("Failed to fetch"))) {
              onError(new Error(`CORS error loading model: ${errorMsg}`));
            } else {
              onError(error instanceof Error ? error : new Error(String(errorMsg)));
            }
          } catch (callbackError) {
            console.error("Error in onError callback:", callbackError);
          }
        }
      }
    );
    
    // Cleanup
    return () => {
      isMounted = false;
      loadingRef.current = false;
    };
  }, [url, onError]);
  
  // Center and scale the model properly when loaded
  useEffect(() => {
    if (gltf && meshRef.current && !modelError) {
      console.log("Model loaded successfully, centering and scaling...");
      
      // Adjust camera position if needed
      camera.position.set(0, 0, 5);
      camera.lookAt(0, 0, 0);
      
      // Try to center the model
      try {
        const box = new THREE.Box3().setFromObject(meshRef.current);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        // Calculate a scale factor based on size
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;
        
        // Apply scale and reposition to center
        meshRef.current.scale.set(scale, scale, scale);
        meshRef.current.position.sub(center.multiplyScalar(scale));
      } catch (e) {
        console.warn("Error centering model:", e);
        // Use default positioning if centering fails
        meshRef.current.scale.set(2, 2, 2);
        meshRef.current.position.set(0, 0, 0);
      }
    }
  }, [gltf, camera, modelError]);

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      loadingRef.current = false;
    };
  }, []);

  useFrame((state) => {
    if (meshRef.current && !modelError) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.1;
    }
  });

  if (loadingModel && !modelError) {
    return (
      <Html center>
        <div className="flex flex-col items-center justify-center text-primary">
          <Loader2 className="w-8 h-8 mb-2 animate-spin" />
          <span className="text-sm">{progressRef.current}% loaded</span>
        </div>
      </Html>
    );
  }
  
  if (modelError || !gltf) {
    return <PlaceholderModel />;
  }
  
  return (
    <primitive ref={meshRef} object={gltf.scene} position={[0, 0, 0]} />
  );
}

export default function ModelViewer({ 
  modelUrl,
  onError
}: { 
  modelUrl?: string,
  onError?: (error: Error) => void
}) {
  const [currentModelUrl, setCurrentModelUrl] = useState<string | null>(null)
  const [modelLoadError, setModelLoadError] = useState<string | null>(null)
  const { toast } = useToast()
  
  // Update model URL when prop changes
  useEffect(() => {
    if (modelUrl) {
      console.log("Received new model URL to load:", modelUrl);
      setCurrentModelUrl(modelUrl);
      setModelLoadError(null);
    }
  }, [modelUrl]);

  // Handle model loading errors
  const handleModelError = (error: Error) => {
    console.error("Error loading model:", error);
    setModelLoadError(error.message);
    
    // Call external error handler if provided
    if (onError) {
      onError(error);
    }
    
    // Create a more user-friendly error message
    let errorMessage = "Failed to load 3D model";
    
    if (error.message.includes("404")) {
      errorMessage = "Model file not found (404)";
    } else if (error.message.includes("401")) {
      errorMessage = "Unauthorized access to model file (401)";
    } else if (error.message.includes("CORS")) {
      errorMessage = "Cross-origin (CORS) issue loading model. Using proxy API route...";
      
      // If we get a CORS error and the URL doesn't already use our proxy,
      // try to use our proxy API (this is a fallback in case the meshy-api.ts change didn't catch it)
      if (currentModelUrl && !currentModelUrl.startsWith('/api/proxy')) {
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(currentModelUrl)}`;
        console.log(`Trying to load via proxy: ${proxyUrl}`);
        setCurrentModelUrl(proxyUrl);
        return; // Don't show toast yet, we're trying the proxy
      }
    } else if (error.message.includes("Failed to fetch")) {
      errorMessage = "Failed to fetch model file. Network error or incorrect URL format.";
    }
    
    toast({
      title: "Model Loading Error",
      description: errorMessage,
      variant: "destructive",
    });
  };

  return (
    <Canvas className="h-full w-full">
      <ambientLight intensity={0.5} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
      <pointLight position={[-10, -10, -10]} />

      <PresentationControls
        global
        rotation={[0.13, 0.1, 0]}
        polar={[-0.4, 0.2]}
        azimuth={[-1, 0.75]}
        speed={2}
        zoom={1}
      >
        <Suspense fallback={<Loader />}>
          {currentModelUrl ? (
            <Model url={currentModelUrl} onError={handleModelError} />
          ) : (
            <PlaceholderModel />
          )}
        </Suspense>
      </PresentationControls>

      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      <Environment preset="studio" />
    </Canvas>
  )
}

