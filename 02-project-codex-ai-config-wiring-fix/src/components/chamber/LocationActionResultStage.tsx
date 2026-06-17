import { GlobalDialogueStage } from '../dialogue/GlobalDialogueStage';

interface LocationActionResultStageProps {
  locationName: string;
  content: string;
  className?: string;
  dialogueClassName?: string;
  busy?: boolean;
  onNextAction: () => void;
}

export function LocationActionResultStage({
  locationName,
  content,
  className = 'global-dialogue-stage--chamber global-dialogue-stage--narration',
  dialogueClassName = 'palace-dialogue-box--chamber',
  busy = false,
  onNextAction,
}: LocationActionResultStageProps) {
  return (
    <GlobalDialogueStage
      sceneLabel={`${locationName}行动结果舞台`}
      portraitLabel="旁白无立绘"
      ariaLabel={`${locationName}行动结果`}
      className={className}
      dialogueClassName={dialogueClassName}
      suppressPortrait
      characterIdentity="场景旁白"
      characterName={locationName}
      content={content}
      onNextAction={onNextAction}
      busy={busy}
    />
  );
}
