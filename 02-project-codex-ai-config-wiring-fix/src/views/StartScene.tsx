import { useState, type CSSProperties } from 'react';
const menuItems = [
  { id: '开始', label: '开始', title: '开始新的篇章', ariaLabel: '开始新游戏' },
  { id: '前尘', label: '前尘', title: '查看前尘往事', ariaLabel: '前尘成就回顾' },
  { id: '回溯', label: '回溯', title: '读取历史回溯记录', ariaLabel: '回溯历史进度' },
  { id: '设置', label: '设置', title: '游戏系统设置', ariaLabel: '打开设置' },
] as const;

const petals = Array.from({ length: 14 }, (_, index) => ({
  id: `petal-${index}`,
  left: `${4 + index * 6.8}%`,
  delay: `${(index % 7) * 0.95}s`,
  duration: `${13 + (index % 6) * 1.6}s`,
  size: `${16 + (index % 5) * 7}px`,
  drift: `${18 + (index % 6) * 10}px`,
}));

const lightOrbs = Array.from({ length: 20 }, (_, index) => ({
  id: `orb-${index}`,
  left: `${5 + (index * 4.6) % 90}%`,
  top: `${7 + (index * 7.7) % 78}%`,
  delay: `${(index % 10) * 0.52}s`,
  duration: `${5.5 + (index % 5) * 1.1}s`,
  size: `${4 + (index % 4) * 4}px`,
}));

interface StartSceneProps {
  backgroundImage?: string;
  title?: string;
  notice?: string;
  noticeKey?: number;
  onAction?: (action: string) => void;
}

export function StartScene({
  backgroundImage,
  title = '凤华录',
  notice,
  noticeKey = 0,
  onAction,
}: StartSceneProps) {
  const [confirmingNewGame, setConfirmingNewGame] = useState(false);
  const stageStyle = {
    ['--start-scene-bg' as string]: `url('${backgroundImage ?? '/assets/start-scene-bg-hq.png'}')`,
    ['--start-scene-logo-mask' as string]: "url('/assets/fenghualu-mask.png')",
  } as CSSProperties;
  const handleMenuAction = (action: string) => {
    if (action === '开始') {
      setConfirmingNewGame(true);
      return;
    }
    setConfirmingNewGame(false);
    onAction?.(action);
  };

  const confirmNewGame = () => {
    setConfirmingNewGame(false);
    onAction?.('开始');
  };

  return (
    <main className="start-scene-shell">
      <div id="GameStage" className="start-scene" style={stageStyle}>
        <div id="BackgroundLayer" className="start-scene__background" />

        <div id="ParticleLayer" className="start-scene__particles" aria-hidden="true">
          {lightOrbs.map((orb) => (
            <span
              key={orb.id}
              className="start-scene__orb"
              style={{
                left: orb.left,
                top: orb.top,
                width: orb.size,
                height: orb.size,
                animationDelay: orb.delay,
                animationDuration: orb.duration,
              }}
            />
          ))}

          {petals.map((petal) => (
            <span
              key={petal.id}
              className="start-scene__petal"
              style={{
                left: petal.left,
                top: '-10%',
                width: petal.size,
                height: `calc(${petal.size} * 0.72)`,
                animationDelay: petal.delay,
                animationDuration: petal.duration,
                ['--petal-drift' as string]: petal.drift,
              }}
            />
          ))}
        </div>

        <section id="UILayer" className="start-scene__ui">
          <div className="start-scene__hero">
            <div id="GameLogo" className="start-scene__logo animate-goldGlow" role="img" aria-label={title}>
              <div className="start-scene__logo-aura" aria-hidden="true" />
              <div className="start-scene__logo-mark" aria-hidden="true" />
            </div>

            <h1 className="visually-hidden">{title}</h1>

            <nav id="MenuButtons" className="start-scene__menu" aria-label="游戏开始菜单">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="start-scene__menu-button"
                  title={item.title}
                  aria-label={item.ariaLabel}
                  onClick={() => handleMenuAction(item.id)}
                >
                  <span className="start-scene__menu-label">{item.label}</span>
                </button>
              ))}
            </nav>
            {notice ? (
              <p key={noticeKey} className="start-scene__notice" role="status">
                {notice}
              </p>
            ) : null}
          </div>
        </section>

        {confirmingNewGame ? (
          <section className="start-scene__confirm-backdrop" role="dialog" aria-label="新游戏确认" aria-modal="true">
            <div className="start-scene__confirm-panel">
              <h2>另开新局</h2>
              <p>开始新游戏会清空当前存档，并立即创建新的存档。</p>
              <div className="start-scene__confirm-actions">
                <button type="button" className="start-scene__confirm-button" onClick={confirmNewGame}>
                  确认新开
                </button>
                <button type="button" className="start-scene__confirm-button is-secondary" onClick={() => setConfirmingNewGame(false)}>
                  取消
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
