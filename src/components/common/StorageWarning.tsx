import usePracticeConfiguration from '../../hooks/usePracticeConfiguration'
import './StorageWarning.css'

function StorageWarning() {
  const { storageWarning } = usePracticeConfiguration()
  return storageWarning ? (
    <p className="storage-warning" role="status" aria-live="polite">
      {storageWarning}
    </p>
  ) : null
}

export default StorageWarning
