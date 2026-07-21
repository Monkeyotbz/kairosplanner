import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useSubscriptionStore } from '../store/subscriptionStore'
import InfinityLogo from '../components/layout/InfinityLogo'
import StarField from '../components/layout/StarField'
import styles from './BillingSuccessPage.module.css'
import { IconArrowRight, IconBrain, IconChartAreaLine, IconCheck, IconFlame } from '@tabler/icons-react'

export default function BillingSuccessPage() {
  const { load } = useSubscriptionStore()

  useEffect(() => {
    // Esperar 2s a que el webhook procese, luego refrescar el estado
    const t = setTimeout(() => load(), 2000)
    return () => clearTimeout(t)
  }, [load])

  return (
    <div className={styles.page}>
      <StarField />
      <div className={styles.content}>
        <div className={styles.iconWrap}>
          <InfinityLogo size={72} state="idle" />
          <div className={styles.checkBadge}>
            <IconCheck size="1em" />
          </div>
        </div>
        <h1 className={styles.title}>¡Bienvenido a KAIROS Pro!</h1>
        <p className={styles.text}>
          Tu suscripción está activa. Ahora tienes acceso completo al poder del momento oportuno.
        </p>
        <div className={styles.perks}>
          <span><IconBrain size="1em" /> ABAD IA activo</span>
          <span><IconChartAreaLine size="1em" /> Flujo de caja</span>
          <span><IconFlame size="1em" /> Rangos y XP</span>
        </div>
        <Link to="/board" className={styles.btn}>
          Ir al tablero <IconArrowRight size="1em" />
        </Link>
        <p className={styles.hint}>
          ¿Necesitas gestionar tu suscripción? La encuentras en{' '}
          <Link to="/upgrade" className={styles.hintLink}>Plan Pro</Link>.
        </p>
      </div>
    </div>
  )
}
