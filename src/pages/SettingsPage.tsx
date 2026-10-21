import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import ButtonLink from '../components/common/ButtonLink'
import Icon from '../components/common/Icon'
import DifficultySelector from '../components/practice/DifficultySelector'
import OperationSelector from '../components/practice/OperationSelector'
import SessionLengthSelector from '../components/practice/SessionLengthSelector'
import PreferenceToggle from '../components/settings/PreferenceToggle'
import usePageTitle from '../hooks/usePageTitle'
import usePracticeConfiguration from '../hooks/usePracticeConfiguration'
import './PracticeSetupPage.css'
import './SettingsPage.css'

const CLEAR_ALL_CONFIRMATION =
  'Clear all Math Practice data on this device? This permanently erases your settings, practice history, statistics, and mistake patterns, and ends your current session. This cannot be undone.'

function SettingsPage() {
  usePageTitle('Settings')
  const { progress, session, patchSettings, clearAllData } =
    usePracticeConfiguration()
  const { settings } = progress
  const navigate = useNavigate()
  const clearing = useRef(false)
  const [clearFailed, setClearFailed] = useState(false)

  function confirmClearAll() {
    if (clearing.current) return
    clearing.current = true
    if (!window.confirm(CLEAR_ALL_CONFIRMATION)) {
      clearing.current = false
      return
    }
    if (clearAllData()) navigate('/', { replace: true })
    else {
      clearing.current = false
      setClearFailed(true)
    }
  }

  return (
    <div className="settings-page">
      <div className="settings-page__heading">
        <div>
          <p className="eyebrow">
            <Icon name="settings" /> Your learning space
          </p>
          <h1 id="page-heading">Make it feel like you</h1>
          <p>
            Choose what helps you learn. Changes save automatically on this
            device.
          </p>
        </div>
        <ButtonLink
          to={session?.isActive ? '/practice/session' : '/practice/setup'}
        >
          {session?.isActive ? 'Continue Practice' : 'Start Practice'}{' '}
          <Icon name="arrow" />
        </ButtonLink>
      </div>
      <section
        className="settings-preferences"
        aria-labelledby="settings-preferences-heading"
      >
        <h2 id="settings-preferences-heading">Make practice comfortable</h2>
        <div className="settings-preferences__options">
          <PreferenceToggle
            label="Sound effects"
            description="A short, gentle chime after you mark a result. The same sound for every try."
            checked={settings.soundEnabled}
            onChange={(soundEnabled) => patchSettings({ soundEnabled })}
          />
          <PreferenceToggle
            label="Card animation"
            description="Turn off to switch card sides without motion. Your device’s reduced-motion choice always comes first."
            checked={settings.animationsEnabled}
            onChange={(animationsEnabled) =>
              patchSettings({ animationsEnabled })
            }
          />
          <PreferenceToggle
            label="Show explanations"
            description="Show a little explanation with each revealed answer. You’ll always see the correct answer."
            checked={settings.showExplanations}
            onChange={(showExplanations) => patchSettings({ showExplanations })}
          />
          <PreferenceToggle
            label="Encouraging messages"
            description="Show a quiet word of encouragement after you mark a result. Turn off for a simpler practice screen."
            checked={settings.feedbackEnabled !== false}
            onChange={(feedbackEnabled) => patchSettings({ feedbackEnabled })}
          />
        </div>
      </section>
      <section aria-labelledby="settings-defaults-heading">
        <h2 id="settings-defaults-heading">Start with your favorites</h2>
        <p className="settings-page__description">
          These choices fill in new practice. You can change them just for one
          session on the setup page.
        </p>
        <div className="settings-page__defaults">
          <OperationSelector
            value={settings.defaultOperations}
            onChange={(defaultOperations) =>
              patchSettings({ defaultOperations })
            }
          />
          {settings.defaultOperations.length === 0 && (
            <p className="settings-page__note">
              No default skills selected. Choose at least one on the practice
              setup page to start.
            </p>
          )}
          <DifficultySelector
            value={settings.defaultDifficulty}
            onChange={(defaultDifficulty) =>
              patchSettings({ defaultDifficulty })
            }
          />
          <SessionLengthSelector
            value={settings.defaultSessionLength}
            onChange={(defaultSessionLength) =>
              patchSettings({ defaultSessionLength })
            }
          />
        </div>
      </section>
      <section
        className="settings-clear"
        aria-labelledby="settings-clear-heading"
      >
        <div>
          <h2 id="settings-clear-heading">Start fresh on this device</h2>
          <p id="settings-clear-help">
            This permanently erases settings, practice history, statistics, and
            mistake patterns. It also ends your current session. You’ll return
            home with the original defaults.
          </p>
        </div>
        <button
          type="button"
          className="button button--secondary settings-clear__button"
          aria-describedby="settings-clear-help"
          onClick={confirmClearAll}
        >
          Clear All Application Data
        </button>
        {clearFailed && (
          <p className="settings-clear__notice" role="alert">
            Clear All wasn’t finished. Please try again before reloading.
          </p>
        )}
      </section>
    </div>
  )
}

export default SettingsPage
