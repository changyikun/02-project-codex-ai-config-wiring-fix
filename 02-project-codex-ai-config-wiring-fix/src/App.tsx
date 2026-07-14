import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MAP_HOTSPOTS } from './config/palaceUi';
import { getDialogueRootStyle } from './config/dialogueConfig';
import { NumericChangeToastLayer } from './components/status/NumericChangeToastLayer';
import { getConcubineDisplayRankText } from './game/data/concubineRoster';
import { installPalaceDebugConsole } from './game/lib/debugConsole';
import { useGameFlowStore } from './game/store/gameFlowStore';
import type { ConcubineProfile, MapAreaId, NpcActivityIntent, NpcActivityPurpose } from './game/types';
import { AttributeAssignmentView } from './views/AttributeAssignmentView';
import { ChamberMainView } from './views/ChamberMainView';
import { MapMainView } from './views/MapMainView';
import { OpeningDialogueView } from './views/OpeningDialogueView';
import { RouteSelectionView } from './views/RouteSelectionView';
import { StartScene } from './views/StartScene';

const npcActivityIntentLabels: Record<NpcActivityIntent, string> = {
  'stay-home': '留宫',
  'public-visit': '公共外出',
  'visit-player': '拜访玩家',
  'visit-consort': '拜访妃嫔',
  'social-plot': '社交筹谋',
  'hostile-plot': '敌意筹谋',
};

const npcActivityPurposeLabels: Record<NpcActivityPurpose, string> = {
  gift: '送礼',
  probe: '试探',
  'win-over': '拉拢',
  gossip: '传话',
  pressure: '施压',
  rest: '休整',
  stroll: '散心',
  plot: '筹谋',
};

const npcActivityLocationLabels = new Map<string, string>(MAP_HOTSPOTS.map((hotspot) => [hotspot.id, hotspot.label]));
const START_SCENE_NOTICE_DURATION_MS = 2200;

const formatNpcActivityConsort = (consort?: ConcubineProfile): string =>
  consort ? `${getConcubineDisplayRankText(consort)} ${consort.name}` : '未知妃嫔';

const formatNpcActivityLocation = (
  entry: { intent: NpcActivityIntent; location: MapAreaId | 'home' | 'player-residence' },
  actor?: ConcubineProfile,
  target?: ConcubineProfile,
): string => {
  if (entry.location === 'home') {
    if (entry.intent === 'visit-consort' && target?.residence) {
      return `${target.residence}（目标寝宫）`;
    }
    return actor?.residence ? `${actor.residence}（本宫）` : '本宫';
  }
  if (entry.location === 'player-residence') {
    return '玩家寝殿';
  }
  return npcActivityLocationLabels.get(entry.location) ?? entry.location;
};

export default function App() {
  const currentView = useGameFlowStore((state) => state.currentView);
  const completeViewTransitionCleanup = useGameFlowStore((state) => state.completeViewTransitionCleanup);
  const startNewGame = useGameFlowStore((state) => state.startNewGame);
  const resumeLastSave = useGameFlowStore((state) => state.resumeLastSave);
  const time = useGameFlowStore((state) => state.time);
  const activeMapLocation = useGameFlowStore((state) => state.activeMapLocation);
  const npcActivity = useGameFlowStore((state) => state.npcActivity);
  const concubines = useGameFlowStore((state) => state.concubines);
  const customConsorts = useGameFlowStore((state) => state.customConsorts);
  const [startSceneNotice, setStartSceneNotice] = useState('');
  const [startSceneNoticeKey, setStartSceneNoticeKey] = useState(0);
  const startSceneNoticeTimerRef = useRef<number | null>(null);
  const npcActivityDebugLoggedXunRef = useRef<string | null>(null);
  const dialogueRootStyle = getDialogueRootStyle();

  useEffect(() => {
    if (import.meta.env.PROD || import.meta.env.MODE === 'test') {
      return undefined;
    }
    return installPalaceDebugConsole();
  }, []);

  useEffect(() => {
    const preventBrowserExtraction = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('input, textarea, [contenteditable="true"]')) {
        return;
      }
      event.preventDefault();
    };

    document.addEventListener('selectstart', preventBrowserExtraction);
    document.addEventListener('dragstart', preventBrowserExtraction);
    return () => {
      document.removeEventListener('selectstart', preventBrowserExtraction);
      document.removeEventListener('dragstart', preventBrowserExtraction);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (startSceneNoticeTimerRef.current !== null) {
        window.clearTimeout(startSceneNoticeTimerRef.current);
      }
    };
  }, []);

  const npcActivityDebugRows = useMemo(() => {
    const consortMap = new Map<string, ConcubineProfile>();
    [...concubines, ...customConsorts].forEach((consort) => {
      consortMap.set(consort.id, consort);
    });

    return Object.values(npcActivity.entries)
      .map((entry) => {
        const actor = consortMap.get(entry.actorConsortId);
        const target = entry.targetConsortId ? consortMap.get(entry.targetConsortId) : undefined;
        return {
          妃嫔: formatNpcActivityConsort(actor),
          行动: npcActivityIntentLabels[entry.intent],
          目的: npcActivityPurposeLabels[entry.purpose],
          地点: formatNpcActivityLocation(entry, actor, target),
          目标: target ? formatNpcActivityConsort(target) : '',
          当前地点: activeMapLocation && entry.location === activeMapLocation ? '是' : '',
          状态: entry.resolved ? '已触发' : '未触发',
          摘要: entry.summary,
          id: entry.id,
        };
      })
      .sort((left, right) => left.妃嫔.localeCompare(right.妃嫔, 'zh-Hans-CN'));
  }, [activeMapLocation, concubines, customConsorts, npcActivity.entries]);

  useEffect(() => {
    if (import.meta.env.MODE === 'test') {
      return;
    }

    if (currentView !== 'map-main' && currentView !== 'bedchamber') {
      return;
    }

    const xunKey = npcActivity.xunKey ?? `${time.year}-${time.month}-${time.xun}`;
    if (npcActivityDebugLoggedXunRef.current === xunKey) {
      return;
    }
    npcActivityDebugLoggedXunRef.current = xunKey;
    console.debug(`[npc-activity] ${xunKey}`);
    console.table(npcActivityDebugRows);
  }, [currentView, npcActivity.xunKey, npcActivityDebugRows, time.month, time.xun, time.year]);

  const clearStartSceneNotice = () => {
    if (startSceneNoticeTimerRef.current !== null) {
      window.clearTimeout(startSceneNoticeTimerRef.current);
      startSceneNoticeTimerRef.current = null;
    }
    setStartSceneNotice('');
  };

  const showStartSceneNotice = (message: string) => {
    if (startSceneNoticeTimerRef.current !== null) {
      window.clearTimeout(startSceneNoticeTimerRef.current);
    }
    setStartSceneNoticeKey((current) => current + 1);
    setStartSceneNotice(message);
    startSceneNoticeTimerRef.current = window.setTimeout(() => {
      setStartSceneNotice('');
      startSceneNoticeTimerRef.current = null;
    }, START_SCENE_NOTICE_DURATION_MS);
  };

  const handleStartSceneAction = (action: string) => {
    if (action === '开始') {
      clearStartSceneNotice();
      startNewGame();
      return;
    }

    if (action === '回溯') {
      const result = resumeLastSave();
      if (result.success) {
        clearStartSceneNotice();
      } else {
        showStartSceneNotice(result.message);
      }
      return;
    }

    showStartSceneNotice('当前功能试玩版未开放');
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'start':
        return <StartScene notice={startSceneNotice} noticeKey={startSceneNoticeKey} onAction={handleStartSceneAction} />;
      case 'route-selection':
        return <RouteSelectionView />;
      case 'attribute-assignment':
        return <AttributeAssignmentView />;
      case 'opening-dialogue':
        return <OpeningDialogueView />;
      case 'map-main':
        return <MapMainView />;
      case 'bedchamber':
        return <ChamberMainView />;
      default:
        return <StartScene notice={startSceneNotice} noticeKey={startSceneNoticeKey} onAction={handleStartSceneAction} />;
    }
  };

  return (
    <>
      <AnimatePresence mode="wait" onExitComplete={completeViewTransitionCleanup}>
        <motion.div
          key={currentView}
          data-dialogue-root="locked"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: currentView === 'start' ? 0.3 : 0.35 }}
          style={dialogueRootStyle}
        >
          {renderCurrentView()}
        </motion.div>
      </AnimatePresence>
      <NumericChangeToastLayer />
    </>
  );
}
