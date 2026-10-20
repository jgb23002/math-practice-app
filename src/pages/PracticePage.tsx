import FeaturePlaceholder from '../components/common/FeaturePlaceholder'
import PracticePlan from '../components/practice/PracticePlan'
import usePracticeConfiguration from '../hooks/usePracticeConfiguration'

function PracticePage() {
  const { configuration } = usePracticeConfiguration()
  return (
    <FeaturePlaceholder
      section="Practice session"
      title="Your practice space"
      description={
        configuration
          ? 'Your choices are ready! Practice cards are on their way. You can explore the practice page to change your choices anytime.'
          : 'Practice cards are on their way! For now, you can explore the practice page or head home. A new challenge will be waiting soon.'
      }
      icon="sparkles"
      showPracticeLink
    >
      {configuration && (
        <PracticePlan
          {...configuration}
          className="session-plan"
          label="Your selected practice configuration"
        />
      )}
    </FeaturePlaceholder>
  )
}

export default PracticePage
