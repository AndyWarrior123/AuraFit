import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useState, useRef, useCallback } from 'react'
import { useVoiceParse } from '../hooks/useActivities'

type VoiceState = 'idle' | 'listening' | 'processing' | 'success' | 'error'

interface VoiceInputProps {
  size?: 'sm' | 'lg'
  onSuccess?: () => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecognition = any

export function VoiceInput({ size = 'lg', onSuccess }: VoiceInputProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [transcript, setTranscript] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const recognitionRef = useRef<AnyRecognition>(null)
  const finalRef = useRef('')
  const parseMutation = useVoiceParse()

  const startListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    if (!SR) {
      setErrorMsg('Speech recognition not supported. Try Chrome.')
      setVoiceState('error')
      return
    }

    const recognition: AnyRecognition = new SR()
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition
    finalRef.current = ''

    setVoiceState('listening')
    setTranscript('')
    setErrorMsg('')

    recognition.onresult = (e: AnyRecognition) => {
      const text = Array.from(e.results as AnyRecognition[])
        .map((r: AnyRecognition) => r[0].transcript as string)
        .join('')
      setTranscript(text)
      if (e.results[e.results.length - 1]?.isFinal) {
        finalRef.current = text
      }
    }

    recognition.onend = async () => {
      const captured = finalRef.current || transcript
      if (!captured.trim()) {
        setVoiceState('idle')
        return
      }
      setVoiceState('processing')
      try {
        await parseMutation.mutateAsync({ transcript: captured })
        setVoiceState('success')
        onSuccess?.()
        setTimeout(() => { setVoiceState('idle'); setTranscript('') }, 2500)
      } catch {
        setErrorMsg('Could not parse activity. Try again.')
        setVoiceState('error')
        setTimeout(() => setVoiceState('idle'), 3000)
      }
    }

    recognition.onerror = (e: AnyRecognition) => {
      if (e.error !== 'no-speech') {
        setErrorMsg('Microphone error. Please allow mic access.')
        setVoiceState('error')
        setTimeout(() => setVoiceState('idle'), 3000)
      } else {
        setVoiceState('idle')
      }
    }

    recognition.start()
  }, [transcript, parseMutation, onSuccess])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const orbSize = size === 'lg' ? 96 : 64
  const iconSize = size === 'lg' ? 28 : 20

  const stateConfig = {
    idle:       { color: '#a855f7', label: size === 'lg' ? 'Tap to speak' : '' },
    listening:  { color: '#06b6d4', label: 'Listening...' },
    processing: { color: '#f59e0b', label: 'Parsing...' },
    success:    { color: '#22c55e', label: 'Logged!' },
    error:      { color: '#ef4444', label: errorMsg || 'Error' },
  }

  const cfg = stateConfig[voiceState]

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex items-center justify-center">
        {/* Pulse rings (listening only) */}
        <AnimatePresence>
          {voiceState === 'listening' && (
            <>
              {[1, 2, 3].map(i => (
                <motion.div
                  key={i}
                  className="absolute rounded-full border"
                  style={{
                    width: orbSize + i * 24,
                    height: orbSize + i * 24,
                    borderColor: `rgba(6, 182, 212, ${0.4 / i})`,
                  }}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: [1, 1.15, 1], opacity: [0.6 / i, 0, 0.6 / i] }}
                  transition={{ duration: 1.5, delay: i * 0.3, repeat: Infinity }}
                />
              ))}
            </>
          )}
        </AnimatePresence>

        {/* Main orb */}
        <motion.button
          className="relative rounded-full flex items-center justify-center cursor-pointer select-none"
          style={{
            width: orbSize,
            height: orbSize,
            background: `radial-gradient(circle at 35% 35%, ${cfg.color}44, ${cfg.color}11)`,
            border: `2px solid ${cfg.color}66`,
            boxShadow: `0 0 30px ${cfg.color}44, 0 0 60px ${cfg.color}18`,
          }}
          onClick={voiceState === 'listening' ? stopListening : startListening}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={
            voiceState === 'idle'
              ? { boxShadow: [`0 0 20px ${cfg.color}33`, `0 0 40px ${cfg.color}66`, `0 0 20px ${cfg.color}33`] }
              : {}
          }
          transition={voiceState === 'idle' ? { duration: 2.5, repeat: Infinity, ease: 'easeInOut' } : {}}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={voiceState}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {voiceState === 'idle' && <Mic size={iconSize} color={cfg.color} />}
              {voiceState === 'listening' && <MicOff size={iconSize} color={cfg.color} />}
              {voiceState === 'processing' && (
                <Loader2 size={iconSize} color={cfg.color} className="animate-spin" />
              )}
              {voiceState === 'success' && <CheckCircle2 size={iconSize} color={cfg.color} />}
              {voiceState === 'error' && <AlertCircle size={iconSize} color={cfg.color} />}
            </motion.div>
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Status label */}
      <AnimatePresence mode="wait">
        <motion.div
          key={voiceState + transcript}
          className="text-center max-w-xs"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <p className="text-sm font-medium" style={{ color: cfg.color }}>
            {cfg.label}
          </p>
          {transcript && voiceState === 'listening' && (
            <p className="text-xs text-slate-400 mt-1 italic">"{transcript}"</p>
          )}
          {voiceState === 'processing' && transcript && (
            <p className="text-xs text-slate-500 mt-1">"{transcript}"</p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
