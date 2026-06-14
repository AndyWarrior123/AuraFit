import { motion, AnimatePresence } from 'framer-motion'

interface LevelUpOverlayProps {
    level: number
    visible: boolean
    onDone: () => void
}

export function LevelUpOverlay({ level, visible, onDone }: LevelUpOverlayProps) {
    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    className='fixed inset-0 z-50 flex flex-col items-center justify-center'
                    style={{ background: 'rgba(8,8,24,0.92)', backdropFilter: 'blur(8px)'}}
                    initial={{opacity: 0}}
                    animate={{opacity: 1}}
                    exit={{opacity: 0}}
                    onClick={onDone}
                >
                {[1,2,3].map(i => (
                    <motion.div 
                        key={i}
                        className='absolute rounded-full border-2'
                        style={{ borderColor: 'rgba(168, 85, 247, 0.4)'}}
                        initial={{width: 0, height: 0, opacity: 1}}
                        animate={{width: i*200, height: i*200, opacity: 0}}
                        transition={{duration: 1.2, delay: i*0.15, ease: 'easeOut'}}
                    />
                ))}    
                <motion.div
                    className='text-center space-y-3'
                    initial={{ scale: 0.5, opacity: 0}}
                    animate={{ scale: 1, opacity: 1}}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.1}}
                >
                    <p className='text-slate-400 text-sm uppercase tracking-widest'>Level Up!</p>
                    <p 
                    className='text-8xl font-black neon-text-gold'
                    style={{fontFamily: 'Orbitron, system-ui'}}>
                        {level}
                    </p>
                    <p className='text-slate-500 text-sm'>Tap anywhere to continue</p>

                </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}