import { useApplicationStatus } from '../../app/ApplicationStatusContext'
import './StorageWarning.css'

function StorageWarning() {
  const { storageWarning } = useApplicationStatus()
  return storageWarning ? (
    <p className="storage-warning" role="status" aria-live="polite">
      {storageWarning}
    </p>
  ) : null
}

export default StorageWarning
