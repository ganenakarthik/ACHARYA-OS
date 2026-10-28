import { useStore } from '../store/useStore'
import './ExamOverlay.css'

export default function ExamOverlay() {
  const { closeExam } = useStore()
  return (
    <div className="exam-overlay">
      <div className="exam-overlay-border" />
      <div className="exam-overlay-label">
        <span className="exam-overlay-icon">◇</span>
        EXAM MODE ACTIVE — ALL FEATURES LOCKED
      </div>
      <button className="exam-overlay-skip" onClick={closeExam}>
        SKIP EXAM
      </button>
    </div>
  )
}
