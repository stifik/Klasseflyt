"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Pause, RotateCcw, Timer, Watch, Maximize, Minimize } from "lucide-react";
import { cn } from "@/lib/utils";

const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);

    return {
        minutes: minutes.toString().padStart(2, "0"),
        seconds: seconds.toString().padStart(2, "0"),
        milliseconds: milliseconds.toString().padStart(2, "0"),
    };
};

export default function Stopwatch() {
    return (
        <div className="w-full max-w-3xl mx-auto">
            <Tabs defaultValue="stopwatch" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8">
                    <TabsTrigger value="stopwatch" className="flex items-center gap-2">
                        <Watch className="w-4 h-4" />
                        Stoppeklokke
                    </TabsTrigger>
                    <TabsTrigger value="countdown" className="flex items-center gap-2">
                        <Timer className="w-4 h-4" />
                        Nedtelling
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="stopwatch">
                    <StopwatchMode />
                </TabsContent>
                <TabsContent value="countdown">
                    <CountdownMode />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function FullscreenButton({ targetRef }: { targetRef: React.RefObject<HTMLDivElement> }) {
    const [isFullscreen, setIsFullscreen] = useState(false);

    const toggleFullscreen = () => {
        if (!targetRef.current) return;

        if (!document.fullscreenElement) {
            targetRef.current.requestFullscreen().catch((err) => {
                console.error(`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`);
            });
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    return (
        <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 bottom-4 z-10"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Avslutt fullskjerm" : "Fullskjerm"}
        >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
        </Button>
    );
}

function StopwatchMode() {
    const [time, setTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isRunning) {
            const startTime = Date.now() - time;
            intervalRef.current = setInterval(() => {
                setTime(Date.now() - startTime);
            }, 10);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isRunning]);

    const handleReset = () => {
        setIsRunning(false);
        setTime(0);
    };

    const { minutes, seconds, milliseconds } = formatTime(time);

    return (
        <Card ref={cardRef} className="relative bg-background fullscreen:min-h-screen fullscreen:flex fullscreen:flex-col fullscreen:justify-center [&:fullscreen]:min-h-screen [&:fullscreen]:flex [&:fullscreen]:flex-col [&:fullscreen]:justify-center">
            <CardHeader>
                <CardTitle className="text-center text-2xl">Stoppeklokke</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-8 p-8">
                <div className="text-8xl font-mono font-bold tracking-wider tabular-nums">
                    <span>{minutes}</span>:<span>{seconds}</span>
                    <span className="text-4xl text-muted-foreground">.{milliseconds}</span>
                </div>
                <div className="flex gap-4 w-full max-w-md">
                    <Button
                        size="lg"
                        className={cn("flex-1 text-lg h-16", isRunning ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600")}
                        onClick={() => setIsRunning(!isRunning)}
                    >
                        {isRunning ? (
                            <>
                                <Pause className="mr-2 h-6 w-6" /> Stopp
                            </>
                        ) : (
                            <>
                                <Play className="mr-2 h-6 w-6" /> Start
                            </>
                        )}
                    </Button>
                    <Button size="lg" variant="outline" className="flex-1 text-lg h-16" onClick={handleReset}>
                        <RotateCcw className="mr-2 h-6 w-6" /> Nullstill
                    </Button>
                </div>
            </CardContent>
            <FullscreenButton targetRef={cardRef} />
        </Card>
    );
}

function CountdownMode() {
    const [timeLeft, setTimeLeft] = useState(0);
    const [initialTime, setInitialTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [inputMinutes, setInputMinutes] = useState("5");
    const [inputSeconds, setInputSeconds] = useState("0");
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Initialize audio
        audioRef.current = new Audio("/alarm.mp3");
    }, []);

    useEffect(() => {
        if (isRunning && timeLeft > 0) {
            const endTime = Date.now() + timeLeft;
            intervalRef.current = setInterval(() => {
                const remaining = endTime - Date.now();
                if (remaining <= 0) {
                    setTimeLeft(0);
                    setIsRunning(false);
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    // Play sound or show alert
                    playAlarm();
                } else {
                    setTimeLeft(remaining);
                }
            }, 100);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isRunning]);

    const playAlarm = () => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            osc.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 1); // Beep for 1 second
        } catch (e) {
            console.error("Audio play failed", e);
        }
    };

    const handleStart = () => {
        if (timeLeft === 0) {
            const mins = parseInt(inputMinutes) || 0;
            const secs = parseInt(inputSeconds) || 0;
            const totalMs = (mins * 60 + secs) * 1000;
            if (totalMs > 0) {
                setTimeLeft(totalMs);
                setInitialTime(totalMs);
                setIsRunning(true);
            }
        } else {
            setIsRunning(true);
        }
    };

    const handlePause = () => {
        setIsRunning(false);
    };

    const handleReset = () => {
        setIsRunning(false);
        setTimeLeft(0);
        setInitialTime(0);
    };

    const { minutes, seconds } = formatTime(timeLeft);
    const isFinished = timeLeft === 0 && initialTime > 0 && !isRunning;

    return (
        <Card ref={cardRef} className={cn("relative bg-background [&:fullscreen]:min-h-screen [&:fullscreen]:flex [&:fullscreen]:flex-col [&:fullscreen]:justify-center", isFinished && "animate-pulse border-red-500 border-4")}>
            <CardHeader>
                <CardTitle className="text-center text-2xl">Nedtelling</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-8 p-8">
                {timeLeft > 0 || isFinished ? (
                    <div className={cn("text-9xl font-mono font-bold tracking-wider tabular-nums", isFinished ? "text-red-600" : "")}>
                        <span>{minutes}</span>:<span>{seconds}</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-4 text-4xl font-mono">
                        <div className="flex flex-col items-center gap-2">
                            <Input
                                type="number"
                                min="0"
                                max="999"
                                value={inputMinutes}
                                onChange={(e) => setInputMinutes(e.target.value)}
                                className="h-32 w-44 text-center font-bold [font-size:4rem] leading-none"
                            />
                            <span className="text-sm text-muted-foreground font-sans">Minutter</span>
                        </div>
                        <span className="text-6xl pb-8">:</span>
                        <div className="flex flex-col items-center gap-2">
                            <Input
                                type="number"
                                min="0"
                                max="59"
                                value={inputSeconds}
                                onChange={(e) => setInputSeconds(e.target.value)}
                                className="h-32 w-44 text-center font-bold [font-size:4rem] leading-none"
                            />
                            <span className="text-sm text-muted-foreground font-sans">Sekunder</span>
                        </div>
                    </div>
                )}

                <div className="flex gap-4 w-full max-w-md">
                    {isRunning ? (
                        <Button
                            size="lg"
                            className="flex-1 text-lg h-16 bg-yellow-500 hover:bg-yellow-600"
                            onClick={handlePause}
                        >
                            <Pause className="mr-2 h-6 w-6" /> Pause
                        </Button>
                    ) : (
                        <Button
                            size="lg"
                            className="flex-1 text-lg h-16 bg-green-500 hover:bg-green-600"
                            onClick={handleStart}
                        >
                            <Play className="mr-2 h-6 w-6" /> {timeLeft > 0 ? "Fortsett" : "Start"}
                        </Button>
                    )}

                    <Button size="lg" variant="outline" className="flex-1 text-lg h-16" onClick={handleReset}>
                        <RotateCcw className="mr-2 h-6 w-6" /> Nullstill
                    </Button>
                </div>
            </CardContent>
            <FullscreenButton targetRef={cardRef} />
        </Card>
    );
}
