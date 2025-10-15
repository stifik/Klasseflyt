"use client";

import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';

type AgentStatus = 'pending' | 'analyzing' | 'passed' | 'failed';

export default function AgentRevealPage() {
  const [status, setStatus] = useState<AgentStatus>('pending');
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // Hent dagens agent fra database
  const secretAgent = useLiveQuery(() => {
    const today = new Date().toISOString().split('T')[0];
    // Primary key is 'id' which is the date string (YYYY-MM-DD)
    return db.secretAgent.get(today);
  });

  // Poll status hver 500ms for rask respons
  useEffect(() => {
    const checkStatus = () => {
      if (!secretAgent) {
        setStatus('pending');
        return;
      }

      setStatus(secretAgent.status);

      // Show confetti when status is 'passed'
      if (secretAgent.status === 'passed') {
        setShowConfetti(true);
      } else {
        setShowConfetti(false);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 500);

    return () => clearInterval(interval);
  }, [secretAgent]);

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
        {status === 'pending' && (
          <motion.div
            key="pending"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="text-center"
          >
            <motion.div
              animate={{ 
                rotate: 360,
                scale: [1, 1.2, 1]
              }}
              transition={{ 
                rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                scale: { duration: 1, repeat: Infinity }
              }}
              className="text-9xl mb-8"
            >
              ⏳
            </motion.div>
            <h1 className="text-6xl font-bold text-white mb-4">
              Venter på dagens agent...
            </h1>
            <p className="text-3xl text-gray-300">
              Oppdraget er i gang
            </p>
          </motion.div>
        )}

        {status === 'analyzing' && (
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

        {status === 'passed' && (
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
            {secretAgent?.studentName && (
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
            )}
            {secretAgent?.mission && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-3xl text-gray-300 mt-8 max-w-3xl mx-auto"
              >
                Oppdrag: {secretAgent.mission}
              </motion.p>
            )}
          </motion.div>
        )}

        {status === 'failed' && (
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
            {secretAgent?.mission && (
              <p className="text-2xl text-gray-400 mt-8 max-w-3xl mx-auto">
                Oppdrag: {secretAgent.mission}
              </p>
            )}
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
