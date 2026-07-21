import { useState } from 'react'
import { useOnboardingStore } from '../../store/onboardingStore'
import InfinityLogo from './InfinityLogo'
import styles from './Onboarding.module.css'
import { IconLayoutKanban, IconFocus2 } from '@tabler/icons-react'

const STEPS = [
  {
    logo: true,
    title: 'Bienvenido a KAIROS',
    text: 'No es otra app de deadlines y cronómetros. KAIROS crea las condiciones para que entres en flow y trabajes en tu momento de máxima capacidad — tu Kairós, el instante oportuno.',
  },
  {
    icon: IconLayoutKanban,
    title: 'Tu tablero',
    text: 'Organiza tus tareas en listas. Arrastra tarjetas, crea y ordena listas, asigna miembros, etiquetas y fechas. Todo fluye sin fricción.',
  },
  {
    logo: true,
    title: 'ABAD, tu asistente de IA',
    text: 'Pulsa el logo infinito del centro para hablar o escribir con ABAD. Te responde sobre tus pendientes y puede crear o mover tarjetas por ti, por voz.',
  },
  {
    icon: IconFocus2,
    title: 'Modo Enfoque',
    text: 'Entra en una sesión inmersiva sin distracciones, con música y tu tarea. Gana XP, sube de rango y construye tu racha diaria.',
  },
]

export default function Onboarding() {
  const { isOpen, close } = useOnboardingStore()
  const [step, setStep] = useState(0)

  if (!isOpen) return null

  const s = STEPS[step]
  const last = step === STEPS.length - 1

  function finish() {
    setStep(0)
    close()
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.glow} aria-hidden="true" />

        <button className={styles.skip} onClick={finish}>Saltar</button>

        <div className={styles.visual}>
          {s.logo
            ? <InfinityLogo size={88} state={step === 2 ? 'listening' : 'idle'} />
            : <div className={styles.icon}><s.icon size="1em" /></div>}
        </div>

        <h1 className={styles.title}>{s.title}</h1>
        <p className={styles.text}>{s.text}</p>

        <div className={styles.dots}>
          {STEPS.map((_, i) => (
            <span key={i} className={`${styles.dot} ${i === step ? styles.dotActive : ''}`} />
          ))}
        </div>

        <div className={styles.actions}>
          {step > 0 && (
            <button className={styles.back} onClick={() => setStep(s => s - 1)}>Atrás</button>
          )}
          <button
            className={styles.next}
            onClick={() => (last ? finish() : setStep(s => s + 1))}
          >
            {last ? '◐  Empezar' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  )
}
