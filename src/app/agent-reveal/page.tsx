"use client";

import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';

type AgentStatus = 'pending' | 'analyzing' | 'passed' | 'failed';
type ScreenState = 'no-agent' | 'drawing' | 'observing' | 'analyzing' | 'passed' | 'failed';

export default function AgentRevealPage() {
  const [status, setStatus] = useState<AgentStatus>('pending');
  const [screenState, setScreenState] = useState<ScreenState>('no-agent');
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [previousAgent, setPreviousAgent] = useState<any>(null);

  // Hent dagens agent fra database
  const secretAgent = useLiveQuery(() => {
    const today = new Date().toISOString().split('T')[0];
    return db.secretAgent.get(today);
  });

  // Separat effect for å håndtere drawing animasjon
  useEffect(() => {
    if (!secretAgent) return;
    
    // Sjekk om dette er en ny agent
    const isNewAgent = !previousAgent || previousAgent.studentId !== secretAgent.studentId;
    
    if (isNewAgent && secretAgent.status === 'pending') {
      // Sjekk om agenten nettopp ble trukket
      const agentAge = Date.now() - new Date(secretAgent.date).getTime();
      const isJustDrawn = agentAge < 5000;
      
      if (isJustDrawn) {
        setScreenState('drawing');
        setPreviousAgent(secretAgent);
        
        // Etter 3 sekunder, gå til observing
        const timer = setTimeout(() => {
          setScreenState('observing');
        }, 3000);
        
        return () => clearTimeout(timer);
      } else {
        setPreviousAgent(secretAgent);
      }
    }
  }, [secretAgent?.studentId, secretAgent?.date]);

  // Håndter state transitions basert på status
  useEffect(() => {
    if (!secretAgent) {
      setScreenState('no-agent');
      setShowConfetti(false);
      setPreviousAgent(null);
      return;
    }

    // Håndter status endringer
    if (secretAgent.status === 'analyzing') {
      setScreenState('analyzing');
      setShowConfetti(false);
    } else if (secretAgent.status === 'passed') {
      setScreenState('passed');
      setShowConfetti(true);
    } else if (secretAgent.status === 'failed') {
      setScreenState('failed');
      setShowConfetti(false);
    } else if (secretAgent.status === 'pending') {
      // Hvis pending og ikke drawing, vis observing
      if (screenState !== 'drawing') {
        setScreenState('observing');
      }
    }

    setStatus(secretAgent.status);
  }, [secretAgent?.status]);

  // Get window size for confetti
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center overflow-hidden">
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={true}
          numberOfPieces={500}
          gravity={0.3}
        />
      )}

      <AnimatePresence mode="wait">
        {/* Ingen agent trukket enda */}
        {screenState === 'no-agent' && (
          <motion.div
            key="no-agent"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="text-center px-8"
          >
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="text-9xl mb-8"
            >
              🤔
            </motion.div>
            <h1 className="text-6xl font-bold text-white mb-4">
              Vurderer kandidater...
            </h1>
            <motion.p
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-3xl text-gray-300"
            >
              Hvem er verdig til dagens oppdrag?
            </motion.p>
          </motion.div>
        )}

        {/* Agent blir trukket - animasjon */}
        {screenState === 'drawing' && (
          <motion.div
            key="drawing"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="text-center px-8"
          >
            <motion.div
              animate={{ 
                rotate: 360,
                scale: [1, 1.3, 1, 1.3, 1]
              }}
              transition={{ 
                rotate: { duration: 1, repeat: Infinity, ease: "linear" },
                scale: { duration: 0.5, repeat: Infinity }
              }}
              className="text-9xl mb-8"
            >
              🎲
            </motion.div>
            <motion.h1
              animate={{ 
                scale: [1, 1.05, 1],
                textShadow: [
                  "0 0 20px rgba(168,85,247,0.5)",
                  "0 0 40px rgba(168,85,247,0.8)",
                  "0 0 20px rgba(168,85,247,0.5)"
                ]
              }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="text-6xl font-bold text-purple-400 mb-4"
            >
              Søker etter verdig kandidat...
            </motion.h1>
            <motion.p
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-3xl text-gray-300"
            >
              Trekker dagens hemmelige agent
            </motion.p>
          </motion.div>
        )}

        {/* Agent observeres - viser oppdraget */}
        {screenState === 'observing' && secretAgent && (
          <motion.div
            key="observing"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="text-center px-8 max-w-4xl mx-auto"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="text-9xl mb-8"
            >
              👁️
            </motion.div>
            <h1 className="text-6xl font-bold text-blue-400 mb-4">
              Observerer agenten...
            </h1>
            <motion.p
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-3xl text-gray-300 mb-12"
            >
              Vurderer om oppdraget blir fullført
            </motion.p>
            
            {/* Vis oppdraget */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-blue-500/20 backdrop-blur-sm rounded-3xl px-8 py-6 border-2 border-blue-400"
            >
              <p className="text-2xl text-blue-300 mb-3 font-semibold">DAGENS OPPDRAG:</p>
              <p className="text-4xl text-white font-bold">
                {secretAgent.mission}
              </p>
            </motion.div>
          </motion.div>
        )}

        {/* Analyserer - loading for både godkjent OG avvist */}
        {screenState === 'analyzing' && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="text-center"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.3, 1],
                rotate: [0, 180, 360]
              }}
              transition={{ 
                duration: 1.5,
                repeat: Infinity
              }}
              className="text-9xl mb-8"
            >
              🔍
            </motion.div>
            <h1 className="text-6xl font-bold text-yellow-400 mb-4">
              Analyserer oppdrag...
            </h1>
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-3xl text-gray-300"
            >
              Resultatet kommer straks...
            </motion.div>
          </motion.div>
        )}

        {/* Oppdrag godkjent! */}
        {screenState === 'passed' && secretAgent && (
          <motion.div
            key="passed"
            initial={{ opacity: 0, y: 100 }}
            animate={{ 
              opacity: 1, 
              y: 0,
              transition: { type: "spring", stiffness: 100 }
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ 
                scale: [0, 1.5, 1],
                rotate: [0, 360, 360]
              }}
              transition={{ 
                duration: 1,
                times: [0, 0.6, 1]
              }}
              className="text-9xl mb-8"
            >
              ✅
            </motion.div>
            <motion.h1
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-8xl font-black text-green-400 mb-6 drop-shadow-[0_0_30px_rgba(34,197,94,0.5)]"
            >
              MISSION ACCOMPLISHED!
            </motion.h1>
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="bg-green-500/20 backdrop-blur-sm rounded-3xl px-12 py-6 border-4 border-green-400"
            >
              <p className="text-4xl text-white mb-2">Dagens Hemmelige Agent:</p>
              <p className="text-7xl font-bold text-green-300">
                {secretAgent.studentName}
              </p>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-3xl text-gray-300 mt-8 max-w-3xl mx-auto"
            >
              Oppdrag: {secretAgent.mission}
            </motion.p>
          </motion.div>
        )}

        {/* Oppdrag mislykket */}
        {screenState === 'failed' && secretAgent && (
          <motion.div
            key="failed"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="text-center"
          >
            <motion.div
              animate={{ 
                rotate: [0, -10, 10, -10, 10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 0.5,
                times: [0, 0.2, 0.4, 0.6, 0.8, 1],
                repeat: Infinity,
                repeatDelay: 1
              }}
              className="text-9xl mb-8"
            >
              ❌
            </motion.div>
            <motion.h1
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-8xl font-black text-red-500 mb-6 drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]"
            >
              MISSION FAILED
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-4xl text-gray-300"
            >
              Oppdraget ble ikke fullført
            </motion.p>
            <p className="text-2xl text-gray-400 mt-8 max-w-3xl mx-auto">
              Oppdrag: {secretAgent.mission}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions overlay (kan skjules med F11 fullscreen) */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center">
        <p className="text-gray-500 text-sm">
          💡 Trykk F11 for fullskjerm • Denne siden oppdateres automatisk
        </p>
      </div>
    </div>
  );
}
