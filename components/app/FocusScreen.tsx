"use client"

import { useState, useEffect, useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { Play, Pause, RotateCcw, SkipForward, Sprout } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const focusOptions = [15, 25, 30, 45, 60]

function easeOutBack(t: number) {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

function FocusTree3D({ nodes }: { nodes: ("leaf" | "flower" | "fruit")[] }) {
    const nodesCount = nodes.length
    const groupRef = useRef<THREE.Group>(null)
    const nodeRefs = useRef<THREE.Object3D[]>([])
    const stemRefs = useRef<THREE.Mesh[]>([])
    const startTimesRef = useRef<number[]>([])
    const lastCountRef = useRef(0)
    const soilMaps = useRef<{ map: THREE.Texture; bump: THREE.Texture } | null>(null)

    if (!soilMaps.current) {
        const size = 64
        const colorCanvas = document.createElement("canvas")
        colorCanvas.width = size
        colorCanvas.height = size
        const colorCtx = colorCanvas.getContext("2d")
        if (colorCtx) {
            const grad = colorCtx.createLinearGradient(0, 0, size, size)
            grad.addColorStop(0, "#4c1d95")
            grad.addColorStop(1, "#92400e")
            colorCtx.fillStyle = grad
            colorCtx.fillRect(0, 0, size, size)
            for (let i = 0; i < 260; i += 1) {
                const x = Math.random() * size
                const y = Math.random() * size
                const alpha = Math.random() * 0.4
                colorCtx.fillStyle = `rgba(59, 7, 100, ${alpha})`
                colorCtx.fillRect(x, y, 2, 2)
            }
        }

        const bumpCanvas = document.createElement("canvas")
        bumpCanvas.width = size
        bumpCanvas.height = size
        const bumpCtx = bumpCanvas.getContext("2d")
        if (bumpCtx) {
            bumpCtx.fillStyle = "#2a0a44"
            bumpCtx.fillRect(0, 0, size, size)
            for (let i = 0; i < 380; i += 1) {
                const x = Math.random() * size
                const y = Math.random() * size
                const shade = Math.floor(120 + Math.random() * 80)
                bumpCtx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`
                bumpCtx.fillRect(x, y, 2, 2)
            }
        }

        const texture = new THREE.CanvasTexture(colorCanvas)
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping
        texture.repeat.set(2, 2)

        const bumpTexture = new THREE.CanvasTexture(bumpCanvas)
        bumpTexture.wrapS = THREE.RepeatWrapping
        bumpTexture.wrapT = THREE.RepeatWrapping
        bumpTexture.repeat.set(2, 2)

        soilMaps.current = { map: texture, bump: bumpTexture }
    }

    useEffect(() => {
        if (nodesCount > lastCountRef.current) {
            for (let i = lastCountRef.current; i < nodesCount; i += 1) {
                startTimesRef.current[i] = performance.now()
            }
        } else if (nodesCount < lastCountRef.current) {
            startTimesRef.current = startTimesRef.current.slice(0, nodesCount)
        }
        lastCountRef.current = nodesCount
    }, [nodesCount])

    useFrame((state) => {
        const now = state.clock.elapsedTime * 1000
        if (groupRef.current) {
            groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.6) * 0.05
        }
        for (let i = 0; i < nodesCount; i += 1) {
            const start = startTimesRef.current[i] ?? now
            const t = Math.min(1, Math.max(0, (now - start) / 500))
            const eased = Math.min(1, Math.max(0, easeOutBack(t)))
            const node = nodeRefs.current[i]
            const stem = stemRefs.current[i]
            if (node) node.scale.setScalar(eased)
            if (stem) stem.scale.set(1, eased, 1)
        }
    })

    const points = Array.from({ length: nodesCount }, (_, i) => {
        const y = 0.75 + i * 0.18
        const x = Math.sin(i * 0.6) * 0.18
        const z = Math.cos(i * 0.45) * 0.15
        return [x, y, z] as [number, number, number]
    })

    const trunkHeight = Math.max(0.6, 0.5 + nodesCount * 0.1)
    const soilThickness = 0.2
    const soilTop = soilThickness

    const renderNode = (type: "leaf" | "flower" | "fruit") => {
        if (type === "flower") {
            return (
                <group>
                    <mesh>
                        <sphereGeometry args={[0.05, 14, 14]} />
                        <meshStandardMaterial color="#f5d0fe" emissive="#c084fc" emissiveIntensity={0.6} />
                    </mesh>
                    {Array.from({ length: 5 }, (_, idx) => {
                        const angle = (Math.PI * 2 * idx) / 5
                        return (
                            <mesh key={`petal-${idx}`} position={[Math.cos(angle) * 0.08, Math.sin(angle) * 0.05, 0]}>
                            <sphereGeometry args={[0.04, 10, 10]} />
                            <meshStandardMaterial color="#c084fc" emissive="#a855f7" emissiveIntensity={0.7} />
                            </mesh>
                        )
                    })}
                </group>
            )
        }

        return (
            <mesh>
                <icosahedronGeometry args={[0.1, 0]} />
                <meshStandardMaterial color="#c084fc" emissive="#a855f7" emissiveIntensity={0.7} />
            </mesh>
        )
    }

    return (
        <group ref={groupRef} position={[0, 0, 0]}>
            {/* Soil base */}
            <mesh receiveShadow castShadow position={[0, soilThickness / 2, 0]}>
                <boxGeometry args={[3, soilThickness, 3]} />
                <meshStandardMaterial color="#3b145f" roughness={0.95} metalness={0.05} />
            </mesh>
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, soilTop + 0.01, 0]}>
                <planeGeometry args={[3, 3]} />
                <meshStandardMaterial
                    map={soilMaps.current?.map}
                    bumpMap={soilMaps.current?.bump}
                    bumpScale={0.12}
                    roughness={0.95}
                />
            </mesh>
            <gridHelper args={[3, 3, "#c4b5fd", "#e9d5ff"]} position={[0, soilTop + 0.02, 0]} />

            {/* Trunk */}
            <mesh castShadow position={[0, soilTop + trunkHeight / 2, 0]}>
                <cylinderGeometry args={[0.09, 0.14, trunkHeight, 14]} />
                <meshStandardMaterial color="#8b5e34" roughness={0.7} />
            </mesh>

            {/* Vine */}
            <group>
                {points.map((p, i) => (
                    <group key={`node-${i}`} position={p}>
                        <mesh
                            ref={(el) => {
                                if (el) stemRefs.current[i] = el
                            }}
                            position={[0, -0.12, 0]}
                            rotation={[0.15, 0, Math.sin(i * 0.4) * 0.25]}
                        >
                            <cylinderGeometry args={[0.045, 0.05, 0.22, 10]} />
                            <meshStandardMaterial color="#6b21a5" roughness={0.5} />
                        </mesh>
                        <group
                            ref={(el) => {
                                if (el) nodeRefs.current[i] = el
                            }}
                        >
                            {renderNode(nodes[i] ?? "leaf")}
                            <mesh position={[0.12, 0.02, 0]} rotation={[0, 0, -0.6]}>
                                <cylinderGeometry args={[0.02, 0.03, 0.18, 8]} />
                                <meshStandardMaterial color="#6b21a5" roughness={0.6} />
                            </mesh>
                        </group>
                    </group>
                ))}
            </group>
        </group>
    )
}

export default function FocusScreen() {
  const [timer, setTimer] = useState(25 * 60)
  const [isActive, setIsActive] = useState(false)
  const [mode, setMode] = useState<"focus" | "break">("focus")
  const [vineNodes, setVineNodes] = useState<("leaf" | "flower" | "fruit")[]>([])
  const [todayFocusTime, setTodayFocusTime] = useState(0) // in minutes
  const [showAchievement, setShowAchievement] = useState<string | null>(null)
    const [showDurationPicker, setShowDurationPicker] = useState(false)
    const [focusMinutes, setFocusMinutes] = useState(25)
    const [manualInputValue, setManualInputValue] = useState("25")
    const durationWheelRef = useRef<HTMLDivElement>(null)
    const manualInputRef = useRef<HTMLInputElement>(null)
    const scrollTimeout = useRef<number | null>(null)
    const manualInputTimerRef = useRef<number | null>(null)

    const completedToday = Math.min(vineNodes.length, 12)
    const totalTasksToday = 12
    const completionRate = Math.round((completedToday / totalTasksToday) * 100)
    const diffMinutes = Math.max(0, todayFocusTime - 120)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
    useEffect(() => {
        if (!showDurationPicker) return
        const el = durationWheelRef.current
        if (!el) return
        const itemHeight = 40
        const index = focusOptions.indexOf(focusMinutes)
        if (index >= 0) el.scrollTop = index * itemHeight
        setManualInputValue(String(focusMinutes))
        if (manualInputRef.current) manualInputRef.current.focus()
    }, [showDurationPicker, focusMinutes])

    function commitManualInput(raw: string) {
        const trimmed = raw.trim()
        if (!trimmed) return
        const parsed = Number.parseFloat(trimmed)
        if (Number.isNaN(parsed)) return
        const val = Math.max(1, Math.min(180, parsed))
        setFocusMinutes(val)
        if (mode === "focus") setTimer(val * 60)
        setManualInputValue(String(val))
    }

    function handleDurationScroll() {
        const el = durationWheelRef.current
        if (!el) return
        if (scrollTimeout.current) cancelAnimationFrame(scrollTimeout.current)
        scrollTimeout.current = requestAnimationFrame(() => {
            const index = Math.round(el.scrollTop / 40)
            const next = focusOptions[Math.min(index, focusOptions.length - 1)]
            if (next !== focusMinutes) {
                setFocusMinutes(next)
                if (mode === "focus") setTimer(next * 60)
            }
        })
    }

    function handleManualInputChange(nextValue: number) {
        if (manualInputTimerRef.current) window.clearTimeout(manualInputTimerRef.current)
        manualInputTimerRef.current = window.setTimeout(() => {
            setFocusMinutes(nextValue)
            if (mode === "focus") setTimer(nextValue * 60)
        }, 180)
    }

  // Load state
  useEffect(() => {
    const savedTime = localStorage.getItem("focus_today_time")
    if (savedTime) setTodayFocusTime(parseInt(savedTime))
    
    // Mock vine state for demo if empty
    const savedNodes = localStorage.getItem("focus_vine_nodes")
    if (savedNodes) {
        setVineNodes(JSON.parse(savedNodes) as ("leaf" | "flower" | "fruit")[])
    } else {
        // Initial sprout
        setVineNodes(["leaf"])
    }
  }, [])

  // Timer Logic
  useEffect(() => {
    if (isActive && timer > 0) {
      timerRef.current = setInterval(() => {
        setTimer((prev) => prev - 1)
      }, 1000)
    } else if (timer === 0 && isActive) {
      handleComplete()
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isActive, timer])

  function handleComplete() {
    setIsActive(false)
    if (mode === "focus") {
      // Add node
      const newNode: "leaf" | "flower" | "fruit" = Math.random() > 0.7 ? "flower" : "leaf"
      const newNodes = [...vineNodes, newNode]
      setVineNodes(newNodes)
      localStorage.setItem("focus_vine_nodes", JSON.stringify(newNodes))
      
      // Update time
    const newTime = todayFocusTime + focusMinutes
      setTodayFocusTime(newTime)
      localStorage.setItem("focus_today_time", newTime.toString())

      // Show toast
      setShowAchievement("🎉 完成一个番茄钟！藤蔓生长了")
      setTimeout(() => setShowAchievement(null), 3000)

      setMode("break")
      setTimer(5 * 60)
    } else {
      setMode("focus")
            setTimer(focusMinutes * 60)
    }
  }

  function toggleTimer() {
    setIsActive(!isActive)
  }

  function resetTimer() {
    setIsActive(false)
        setTimer(mode === "focus" ? focusMinutes * 60 : 5 * 60)
  }

  // Format time mm:ss
  const mins = Math.floor(timer / 60).toString().padStart(2, "0")
  const secs = (timer % 60).toString().padStart(2, "0")
  
  // Progress for circle
    const totalTime = mode === "focus" ? focusMinutes * 60 : 5 * 60
  const completionRatio = 1 - (timer / totalTime)
  const strokeDashoffset = 2 * Math.PI * 120 * (1 - completionRatio) // r=120

    return (
        <div className="flex h-full flex-col bg-gradient-to-b from-indigo-50/50 via-purple-50/30 to-background dark:from-slate-950 dark:via-slate-900 dark:to-background overflow-hidden relative">
      
      {/* 3D Styles */}
      <style jsx global>{`
        .scene-container {
            perspective: 800px;
            overflow: hidden;
        }
        .isometric-world {
            transform-style: preserve-3d;
            transform: rotateX(60deg) rotateZ(45deg) scale(0.7);
            transition: transform 0.5s ease-out;
        }

        @media (max-width: 640px) {
            .isometric-world {
                transform: rotateX(60deg) rotateZ(45deg) scale(0.6);
            }
        }
        
        /* Animations */
      `}</style>
      
            <div className="min-h-0 overflow-hidden" style={{ flex: "0 0 48%" }}>
            {/* Header */}
            <div className="flex-none px-5 pt-8 pb-2">
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground">深度专注</h1>
                        <p className="text-[11px] text-muted-foreground font-medium mt-1">FOCUS MODE</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <button
                            onClick={() => setShowDurationPicker(true)}
                            className="px-3 py-1 rounded-full bg-white/60 dark:bg-white/5 border border-white/40 text-xs font-semibold text-violet-700 dark:text-violet-200"
                        >
                            {focusMinutes}m · 调整
                        </button>
                    </div>
                </div>
            </div>



                {/* 2. Middle - Split Layout */}
                        <div className="flex-1 min-h-0 px-4 pb-3">
                            <div className="grid grid-cols-[7fr_3fr] gap-4 items-stretch h-full min-h-0">
                            <div className="relative scene-container flex items-center justify-center h-full min-h-0">
                          <Canvas
                            shadows
                            gl={{ alpha: true, antialias: true }}
                            camera={{ position: [3.2, 2.6, 3.2], fov: 45 }}
                            className="w-full h-full"
                          >
                            <ambientLight intensity={0.6} />
                            <directionalLight position={[3, 4, 2]} intensity={0.9} castShadow />
                            <pointLight position={[-2, 3, 1]} intensity={0.6} color="#e9d5ff" />
                            <fog attach="fog" args={["#f5f3ff", 4, 10]} />
                            <FocusTree3D nodes={vineNodes.slice(0, completedToday)} />
                          </Canvas>

                          {showAchievement && (
                                  <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-2xl border border-violet-200 animate-in slide-in-from-bottom-5 fade-in z-50 text-nowrap pointer-events-auto flex items-center gap-2">
                                          <Sprout className="w-5 h-5 text-green-500 fill-green-200" />
                                          <span className="text-violet-900 dark:text-violet-100 font-bold text-xs">{showAchievement}</span>
                                  </div>
                          )}
                        </div>

                    <div className="grid grid-rows-2 gap-3 h-full">
                        <div className="bg-white/60 dark:bg-black/25 backdrop-blur-md border border-white/60 dark:border-white/10 px-3 py-2 rounded-2xl shadow-[0_10px_30px_rgba(124,58,237,0.08)] flex flex-col justify-between">
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-semibold whitespace-nowrap">
                                <span>⏱️</span>
                                <span>今日专注</span>
                            </div>
                            <div className="mt-2 text-xl font-black text-foreground font-mono whitespace-nowrap">
                                {Math.floor(todayFocusTime / 60)}h {todayFocusTime % 60}m
                            </div>
                            <div className="mt-1 text-[10px] text-muted-foreground whitespace-nowrap">
                                比昨天 +{diffMinutes}m
                            </div>
                        </div>

                        <div className="bg-white/60 dark:bg-black/25 backdrop-blur-md border border-white/60 dark:border-white/10 px-3 py-2 rounded-2xl shadow-[0_10px_30px_rgba(124,58,237,0.08)] flex flex-col justify-between">
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-semibold whitespace-nowrap">
                                <span>✅</span>
                                <span>今日完成</span>
                            </div>
                            <div className="mt-2 text-xl font-black text-foreground font-mono whitespace-nowrap">
                                {completedToday} 个任务
                            </div>
                            <div className="mt-1 text-[10px] text-muted-foreground whitespace-nowrap">
                                总任务 {totalTasksToday} · {completionRate}%
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            </div>

            {/* 3. Bottom Controls */}
                <div
                            className="min-h-0 bg-white/40 dark:bg-black/40 backdrop-blur-[30px] rounded-t-[40px] border-t border-white/20 dark:border-white/5 px-3 pt-2 pb-4 relative z-20 shadow-[0_-10px_60px_rgba(0,0,0,0.05)]"
                            style={{ flex: "0 0 52%" }}
                        >
         
                 <div className="flex flex-col h-full justify-center gap-4">
             
                     {/* Timer Display */}
                     <div className="relative w-56 h-56 flex items-center justify-center mx-auto">
                 {/* Progress Ring */}
                 <svg className="w-full h-full -rotate-90 drop-shadow-2xl">
                     {/* Track */}
                     <circle cx="112" cy="112" r="104" stroke="currentColor" strokeWidth="8" fill="none" className="text-muted/10" />
                     {/* Indicator */}
                                         <circle
                                             cx="112" cy="112" r="104"
                       stroke="url(#gradient)"
                       strokeWidth="12"
                       fill="none"
                                             strokeDasharray={2 * Math.PI * 104}
                                             strokeDashoffset={2 * Math.PI * 104 * (1 - completionRatio)}
                       strokeLinecap="round"
                       className="transition-all duration-1000 ease-linear shadow-[0_0_30px_rgba(139,92,246,0.5)]"
                     />
                     <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#c084fc" />
                            <stop offset="100%" stopColor="#7c3aed" />
                        </linearGradient>
                     </defs>
                 </svg>
                 
                 {/* Time Text */}
                 <div className="absolute flex flex-col items-center">
                            <button 
                                onClick={() => setShowDurationPicker(true)}
                                className="text-5xl font-black font-mono tracking-tighter text-foreground"
                                style={{ 
                                     textShadow: '0 2px 0 rgba(255,255,255,0.5), 0 -1px 0 rgba(0,0,0,0.1)',
                                     letterSpacing: '-0.05em'
                                }}
                            >
                                {mins}:{secs}
                            </button>
                     <span className={cn(
                        "mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border transition-colors",
                         isActive ? "bg-violet-500/10 text-violet-600 border-violet-200" : "bg-muted/50 text-muted-foreground border-transparent"
                     )}>
                        {mode === "focus" ? "专注中" : "休息中"}
                     </span>
                 </div>
             </div>

                 {/* Buttons */}
                 <div className="flex items-center gap-4 w-full justify-center px-2">
                      <Button 
                          variant="outline" 
                          className="h-12 w-28 rounded-2xl border border-white/60 bg-white/70 text-violet-500 hover:text-violet-600 hover:border-violet-200 transition-all shadow-sm"
                          onClick={resetTimer}
                      >
                          <RotateCcw className="w-5 h-5" />
                      </Button>

                                <Button 
                                    className="h-12 w-28 rounded-2xl bg-violet-500/70 hover:bg-violet-500 shadow-lg shadow-violet-500/30 border border-white/40 active:scale-95 transition-all"
                                  onClick={toggleTimer}
                             >
                                  {isActive ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white ml-1" />}
                             </Button>

                      <Button 
                          variant="outline" 
                          className="h-12 w-28 rounded-2xl border border-white/60 bg-white/70 text-violet-500 hover:text-violet-600 hover:border-violet-200 transition-all shadow-sm"
                          onClick={handleComplete}
                      >
                          <SkipForward className="w-5 h-5" />
                      </Button>
                 </div>

         </div>
      </div>

            {showDurationPicker && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center focus-duration-modal">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowDurationPicker(false)} />
                    <div
                        className="relative z-10 w-full max-w-sm rounded-3xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl p-5 shadow-2xl pointer-events-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-foreground">设置专注时长</span>
                            <button className="text-xs text-muted-foreground" onClick={() => setShowDurationPicker(false)}>
                                关闭
                            </button>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <div
                                        ref={durationWheelRef}
                                        onScroll={handleDurationScroll}
                                        className="h-32 overflow-y-auto no-scrollbar text-center pointer-events-auto"
                                        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
                                    >
                                        <div className="h-10" />
                                        {focusOptions.map((m, index) => (
                                            <button
                                                key={m}
                                                onClick={() => {
                                                    const itemHeight = 40
                                                    if (durationWheelRef.current) {
                                                        durationWheelRef.current.scrollTop = index * itemHeight
                                                    }
                                                    setFocusMinutes(m)
                                                    if (mode === "focus") setTimer(m * 60)
                                                }}
                                                className={`h-10 w-full flex items-center justify-center text-xs rounded-md snap-center transition-colors ${
                                                    focusMinutes === m
                                                        ? "bg-violet-400 text-white shadow"
                                                        : "text-muted-foreground hover:text-foreground"
                                                }`}
                                            >
                                                {m}分钟
                                            </button>
                                        ))}
                                        <div className="h-10" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 w-28">
                                <span className="text-xs text-muted-foreground">自定义</span>
                                <input
                                    ref={manualInputRef}
                                    type="number"
                                    min={1}
                                    max={180}
                                    step="0.5"
                                    value={manualInputValue}
                                    onChange={(e) => {
                                        const raw = e.target.value
                                        setManualInputValue(raw)
                                        if (raw.trim() === "") return
                                        const parsed = Number.parseFloat(raw)
                                        if (Number.isNaN(parsed)) return
                                        const val = Math.max(1, Math.min(180, parsed))
                                        handleManualInputChange(val)
                                    }}
                                    onBlur={(e) => commitManualInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") commitManualInput((e.target as HTMLInputElement).value)
                                    }}
                                    className="w-full rounded-lg border border-violet-200/60 bg-white/70 px-2 py-1 text-xs text-foreground"
                                />
                                <button
                                    onClick={() => setShowDurationPicker(false)}
                                    className="mt-auto w-full py-2 rounded-xl bg-violet-500 text-white text-xs font-semibold"
                                >
                                    确定
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
    </div>
  )
}
