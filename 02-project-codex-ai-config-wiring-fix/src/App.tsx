import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { getDialogueRootStyle } from './config/dialogueConfig';
import { NumericChangeToastLayer } from './components/status/NumericChangeToastLayer';
import { useGameFlowStore } from './game/store/gameFlowStore';
import { AttributeAssignmentView } from './views/AttributeAssignmentView';
import { ChamberMainView } from './views/ChamberMainView';
import { MapMainView } from './views/MapMainView';
import { OpeningDialogueView } from './views/OpeningDialogueView';
import { RouteSelectionView } from './views/RouteSelectionView';
import { StartScene } from './views/StartScene';

export default function App() {
  const currentView = useGameFlowStore((state) => state.currentView);
  const startNewGame = useGameFlowStore((state) => state.startNewGame);
  const resumeLastSave = useGameFlowStore((state) => state.resumeLastSave);
  const [startSceneNotice, setStartSceneNotice] = useState('');
  const dialogueRootStyle = getDialogueRootStyle();

  const handleStartSceneAction = (action: string) => {
    if (action === '开始') {
      setStartSceneNotice('');
      startNewGame();
      return;
    }

    if (action === '回溯') {
      const result = resumeLastSave();
      setStartSceneNotice(result.success ? '' : result.message);
    }
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'start':
        return <StartScene notice={startSceneNotice} onAction={handleStartSceneAction} />;
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
        return <StartScene notice={startSceneNotice} onAction={handleStartSceneAction} />;
    }
  };

  return (
    <>
      <AnimatePresence mode="wait">
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
