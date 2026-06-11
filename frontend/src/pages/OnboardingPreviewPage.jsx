import { useNavigate } from 'react-router-dom'
import AbadOnboarding from '../components/kairos/AbadOnboarding'
import styles from './OnboardingPreviewPage.module.css'

export default function OnboardingPreviewPage() {
  const navigate = useNavigate()
  return (
    <div className={styles.page}>
      <AbadOnboarding preview onExit={() => navigate('/board')} />
    </div>
  )
}
