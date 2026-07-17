import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ConcubineProfile, NightlyServicePendingEvent } from '../../game/types';
import { YINGLUOYETING_FIRST_NIGHT_SERVICE_SCRIPT_ID } from '../../game/lib/yingluoyetingFirstNightServiceRuntime';
import { NightlyServiceEventView } from './NightlyServiceEventView';

const pendingEvent: NightlyServicePendingEvent = {
  id: 'nightly-lanyinxuguo-1-1-1-player-service-pending',
  timeKey: '1-1-1',
  year: 1,
  month: 1,
  xun: 1,
  outcome: 'player-service',
  playerName: '谢令仪',
  rankLabel: '嫔',
  initialInterest: 20,
  currentInterest: 20,
  interactionCount: 0,
  maxInteractions: 3,
  selectedActionIds: [],
  stage: 'notice',
  pregnancyRoll: 100,
};

const buildConsort = (id: string, name: string, relationToPlayer: number): ConcubineProfile => ({
  id,
  routeScope: 'lanyinxuguo',
  portraitId: name,
  name,
  rankLabel: '嫔',
  status: 'live',
  residence: '长春宫',
  stateLabel: '寻常',
  age: 20,
  familyBackground: '内廷旧册',
  personality: '谨慎',
  summary: '测试妃嫔',
  source: 'fixed',
  stats: {
    prestige: 10,
    favor: 30,
    familyInfluence: 10,
    health: 80,
    appearance: 70,
    relationToPlayer,
    childrenCount: 0,
    ambition: 20,
    stress: 10,
    intrigue: 10,
    temperament: 60,
    affection: 0,
    fortune: 0,
  },
  allies: [],
  rivals: [],
});

const clickDialogueToEnd = () => {
  let target = document.querySelector<HTMLElement>('[data-dialogue-page-state="more"]');
  while (target) {
    fireEvent.click(target);
    target = document.querySelector<HTMLElement>('[data-dialogue-page-state="more"]');
  }
};

const clickDialogueContent = () => {
  fireEvent.click(document.querySelector<HTMLElement>('.palace-dialogue-box__content')!);
};

describe('NightlyServiceEventView', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses the shared chamber dialogue frame and side action layout for Yangxin interactions', () => {
    const onComplete = vi.fn();
    render(
      <NightlyServiceEventView
        pendingEvent={pendingEvent}
        playerName="谢令仪"
        playerPortrait="/assets/player/lanyinxuguo-cutout.png"
        concubines={[buildConsort('ally-chen', '陈婉宁', 30), buildConsort('rival-yao', '姚铃儿', -30)]}
        onComplete={onComplete}
      />,
    );

    expect(screen.getAllByLabelText('侍寝太监通报').length).toBeGreaterThan(0);
    expect((document.querySelector('.nightly-service-event__background') as HTMLElement).style.backgroundImage).toContain(
      '/assets/routes/backgrounds/shiqin.png',
    );
    expect(screen.getByAltText('内侍')).toHaveAttribute('src', '/assets/characters/men/taijian.png');
    expect(document.querySelector('.global-dialogue-stage__portrait-media--eunuch')).toBeInTheDocument();
    expect(document.querySelector('.palace-dialogue-box--nightly-service')).toBeNull();
    expect(document.querySelector('.palace-dialogue-box--chamber')).toBeInTheDocument();

    clickDialogueToEnd();
    clickDialogueContent();

    expect(document.querySelector('.nightly-service-event__emperor-stage .global-dialogue-stage__portrait-media--emperor')).toBeInTheDocument();
    expect(document.querySelector('.global-dialogue-stage__portrait-stage .global-dialogue-stage__portrait-media--emperor')).toBeNull();
    expect(document.querySelector('.global-dialogue-stage__portrait-placeholder')).toBeNull();

    clickDialogueContent();

    const actionPanel = screen.getByLabelText('养心殿侍寝操作');
    expect(actionPanel).toHaveClass('nightly-service-event__actions');
    expect(document.querySelector('.global-dialogue-stage__options')).toBeNull();
    expect(screen.getByRole('button', { name: '鼓瑟抚琴' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '鼓瑟抚琴' }));
    expect(document.querySelector('.nightly-service-event__emperor-stage .global-dialogue-stage__portrait-media--emperor')).toBeInTheDocument();
    expect(document.querySelector('.global-dialogue-stage__portrait-stage .global-dialogue-stage__portrait-media--emperor')).toBeNull();
    expect(document.querySelector('.global-dialogue-stage__portrait-placeholder')).toBeNull();
    expect(screen.getByText(/弦音/)).toBeInTheDocument();
    clickDialogueToEnd();
    clickDialogueContent();

    fireEvent.click(screen.getByRole('button', { name: '吟诗作对' }));
    clickDialogueToEnd();
    clickDialogueContent();

    fireEvent.click(screen.getByRole('button', { name: '温言絮语' }));
    expect(screen.getByRole('button', { name: '温柔抚慰' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '为交好妃嫔美言' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '对交恶妃嫔进言' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '为交好妃嫔美言' }));
    expect(screen.getByRole('button', { name: '嫔陈婉宁' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '嫔陈婉宁' }));
    clickDialogueToEnd();
    clickDialogueContent();

    expect(screen.getByText(/宫灯次第低下去/)).toBeInTheDocument();
    clickDialogueToEnd();
    clickDialogueContent();

    expect(screen.getByLabelText('一夜过去')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '进入清晨' })).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(900);
    });
    expect(onComplete).toHaveBeenCalledWith([
      { actionId: 'music' },
      { actionId: 'poetry' },
      { actionId: 'gentle', gentleBranchId: 'praise', targetConsortId: 'ally-chen' },
    ]);
  });

  it('plays the Yingluoyeting first-night script without generic interaction controls', () => {
    const onComplete = vi.fn();
    const scriptedPendingEvent: NightlyServicePendingEvent = {
      ...pendingEvent,
      id: 'nightly-yingluoyeting-1-1-1-first-night-service-pending',
      scriptId: YINGLUOYETING_FIRST_NIGHT_SERVICE_SCRIPT_ID,
      playerName: '柳如是',
      rankLabel: '官女子',
      playerAge: 20,
      initialInterest: 0,
      currentInterest: 0,
      maxInteractions: 0,
      selectedActionIds: [],
    };

    render(
      <NightlyServiceEventView
        pendingEvent={scriptedPendingEvent}
        playerName="柳如是"
        playerPortrait="/assets/player/lanyinxuguo-cutout.png"
        onComplete={onComplete}
      />,
    );

    expect(screen.getByText(/主子！主子！养心殿来人了/)).toBeInTheDocument();
    expect(screen.queryByText(/兴致/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('养心殿侍寝操作')).not.toBeInTheDocument();
    expect((document.querySelector('.nightly-service-event__background') as HTMLElement).style.backgroundImage).toContain(
      'home_yeting_night%20till%20latenight.png',
    );

    clickDialogueToEnd();
    clickDialogueContent();
    expect(screen.getByText(/陛下口谕，宣官女子柳如是今夜往养心殿侍寝/)).toBeInTheDocument();
    expect(screen.getByAltText('内侍')).toHaveAttribute('src', '/assets/characters/men/taijian.png');

    for (let index = 0; index < 6; index += 1) {
      clickDialogueToEnd();
      clickDialogueContent();
    }
    expect((document.querySelector('.nightly-service-event__background') as HTMLElement).style.backgroundImage).toContain(
      'hougong_outside_night.png',
    );

    for (let index = 0; index < 20 && !screen.queryByLabelText('一夜过去'); index += 1) {
      clickDialogueToEnd();
      clickDialogueContent();
    }
    expect(screen.getByLabelText('一夜过去')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(900);
    });
    expect(onComplete).toHaveBeenCalledWith([]);
  });

  it('keeps the scripted background mounted when only the portrait changes', () => {
    const scriptedPendingEvent: NightlyServicePendingEvent = {
      ...pendingEvent,
      id: 'nightly-yingluoyeting-1-1-1-first-night-service-pending',
      scriptId: YINGLUOYETING_FIRST_NIGHT_SERVICE_SCRIPT_ID,
      playerName: '柳如是',
      rankLabel: '官女子',
      playerAge: 20,
      initialInterest: 0,
      currentInterest: 0,
      maxInteractions: 0,
      selectedActionIds: [],
    };

    render(
      <NightlyServiceEventView
        pendingEvent={scriptedPendingEvent}
        playerName="柳如是"
        playerPortrait="/assets/player/lanyinxuguo-cutout.png"
        onComplete={vi.fn()}
      />,
    );

    const initialBackground = document.querySelector('.nightly-service-event__background');
    expect(initialBackground).toBeInTheDocument();

    clickDialogueToEnd();
    clickDialogueContent();

    expect(document.querySelector('.nightly-service-event__background')).toBe(initialBackground);
    expect(screen.getByAltText('内侍')).toBeInTheDocument();
  });
});
