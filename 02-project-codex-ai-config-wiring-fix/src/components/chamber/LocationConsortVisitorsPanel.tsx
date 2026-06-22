import { getConcubineDisplayRankText } from '../../game/data/concubineRoster';
import type { ConcubineProfile, NpcActivityEntry } from '../../game/types';

interface LocationConsortVisitorEntry {
  entry: NpcActivityEntry;
  consort: ConcubineProfile;
}

interface LocationConsortVisitorsPanelProps {
  locationName: string;
  entries: LocationConsortVisitorEntry[];
  onStartAudience: (entryId: string) => void;
}

export function LocationConsortVisitorsPanel({
  locationName,
  entries,
  onStartAudience,
}: LocationConsortVisitorsPanelProps) {
  if (entries.length <= 0) {
    return null;
  }

  return (
    <section className="chamber-main__location-visitors" aria-label={`${locationName}可交互妃嫔`}>
      <strong>本旬在此</strong>
      {entries.map(({ entry, consort }) => (
        <button key={entry.id} type="button" disabled={entry.resolved} onClick={() => onStartAudience(entry.id)}>
          {entry.resolved
            ? `${getConcubineDisplayRankText(consort)} ${consort.name}仍在此处（已交谈）`
            : `与${getConcubineDisplayRankText(consort)} ${consort.name}交谈`}
        </button>
      ))}
    </section>
  );
}
