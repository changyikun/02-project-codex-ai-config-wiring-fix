import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { buildRouteProfiles } from '../game/data/routeProfiles';
import { useGameFlowStore } from '../game/store/gameFlowStore';
import type { RouteSelectionProfile } from '../game/types';

interface RouteSelectionViewProps {
  onConfirm?: () => void;
}

const playableRouteId: RouteSelectionProfile['id'] = 'yingluoyeting';

const playStampFeedback = () => {
  if (navigator.vibrate) {
    navigator.vibrate(18);
  }

  const AudioCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) {
    return;
  }

  const audioContext = new AudioCtor();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(180, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(110, audioContext.currentTime + 0.08);
  gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.22, audioContext.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.14);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.16);
};

export function RouteSelectionView({ onConfirm }: RouteSelectionViewProps) {
  const routeProfiles = useMemo(() => buildRouteProfiles(), []);
  const applyRouteSelection = useGameFlowStore((state) => state.applyRouteSelection);

  const [selectedRouteId, setSelectedRouteId] = useState<RouteSelectionProfile['id']>(playableRouteId);
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(routeProfiles.map((profile) => [profile.id, profile.defaultName])),
  );

  const selectedRoute = routeProfiles.find((profile) => profile.id === selectedRouteId) ?? routeProfiles[0];
  const isSelectedRoutePlayable = selectedRoute.id === playableRouteId;

  const confirmRoute = () => {
    if (!isSelectedRoutePlayable) {
      return;
    }

    const normalizedName = nameDrafts[selectedRoute.id].trim() || selectedRoute.defaultName;
    try {
      playStampFeedback();
    } catch {
      // 音效反馈失败时不应阻断视图跳转。
    }
    applyRouteSelection({
      ...selectedRoute,
      defaultName: normalizedName,
      baseState: {
        ...selectedRoute.baseState,
        name: normalizedName,
      },
    });
    window.setTimeout(() => onConfirm?.(), 180);
  };

  return (
    <main className="route-selection">
      <div className="route-selection__frame">
        <div className="route-selection__background" />
        <div className="route-selection__veil" />

        <div className="route-selection__shell">
          <header className="route-selection__heading">
            <h2>请选择路线</h2>
            <p>*试玩版仅开放影落掖庭线，其他路线敬请期待</p>
          </header>

          <section className="route-selection__rail" aria-label="开局路线列表">
            {routeProfiles.map((route) => (
              <button
                key={route.id}
                type="button"
                className={`route-selection__banner ${selectedRoute.id === route.id ? 'is-active' : ''}`}
                style={{
                  height: `${route.bannerHeight}%`,
                  marginTop: route.bannerOffsetTop ? `${route.bannerOffsetTop}%` : undefined,
                }}
                onClick={() => setSelectedRouteId(route.id)}
              >
                <span className="route-selection__banner-paper" aria-hidden="true" />
                <img src={route.labelArt} alt="" className="route-selection__banner-art" aria-hidden="true" />
                <span className="visually-hidden">{route.label}</span>
              </button>
            ))}
          </section>

          <section className="route-selection__detail">
            <AnimatePresence mode="wait">
              <motion.article
                key={selectedRoute.id}
                className="route-selection__detail-card"
                initial={{ opacity: 0, x: 22, scale: 0.985 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -14, scale: 0.99 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
              >
                <div className="route-selection__detail-body">
                  <p className="route-selection__intro">“{selectedRoute.intro}”</p>

                  <div className="route-selection__field route-selection__field--name">
                    <span className="route-selection__field-label">姓名</span>
                    <input
                      value={nameDrafts[selectedRoute.id]}
                      onChange={(event) =>
                        setNameDrafts((current) => ({
                          ...current,
                          [selectedRoute.id]: event.target.value,
                        }))
                      }
                      placeholder={selectedRoute.defaultName}
                    />
                  </div>

                  <div className="route-selection__field-grid">
                    <div className="route-selection__field">
                      <span className="route-selection__field-label">家世</span>
                      <p className="route-selection__field-value">{selectedRoute.familyDisplay}</p>
                    </div>

                    <div className="route-selection__field">
                      <span className="route-selection__field-label">资质</span>
                      <p className="route-selection__field-value route-selection__field-value--multiline">
                        {selectedRoute.aptitudeDisplay ?? '未知'}
                      </p>
                    </div>

                    <div className="route-selection__field route-selection__field--wide">
                      <span className="route-selection__field-label">生平</span>
                      <p className="route-selection__field-value route-selection__field-value--multiline route-selection__field-value--biography">
                        {selectedRoute.biography}
                      </p>
                    </div>

                    <div className="route-selection__field route-selection__field--wide">
                      <span className="route-selection__field-label">通关要求</span>
                      <p className="route-selection__field-value route-selection__field-value--multiline">
                        {selectedRoute.clearanceRequirement}
                      </p>
                    </div>

                    <div className="route-selection__field">
                      <span className="route-selection__field-label">通关难度</span>
                      <p className="route-selection__field-value">{selectedRoute.difficulty}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`route-selection__confirm ${isSelectedRoutePlayable ? '' : 'is-preview-only'}`}
                    onClick={confirmRoute}
                    aria-label={isSelectedRoutePlayable ? '确定' : '敬请期待'}
                  >
                    {isSelectedRoutePlayable ? (
                      <img src="/assets/routes/buttons/confirm-flower.png" alt="" aria-hidden="true" />
                    ) : (
                      <span>敬请期待</span>
                    )}
                  </button>
                </div>
              </motion.article>
            </AnimatePresence>
          </section>
        </div>
      </div>
    </main>
  );
}
