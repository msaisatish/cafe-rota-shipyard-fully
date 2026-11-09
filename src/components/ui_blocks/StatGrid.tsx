import { statParts, type StatInput } from './blocks';
import { blockClasses, statCopy } from './copy';

import './blocks.css';

/**
 * The row of numbers across the top of a dashboard.
 *
 * A `<dl>` rather than a grid of `<div>`s: each figure is a term and its
 * definition, and that pairing is what a screen reader reads out. A pile of
 * divs reads as a pile of unrelated numbers.
 *
 * Every rule that could make one of these numbers a lie is in `statParts` — a
 * figure always says what period it covers, "never measured" is not shown as
 * zero, a change is a word before it is a colour, and a percentage against zero
 * is refused rather than invented.
 */
export function StatGrid({ stats, caption }: { stats: readonly StatInput[]; caption: string }) {
  return (
    <section aria-label={caption}>
      <dl className={blockClasses.statGrid}>
        {stats.map((input) => {
          const stat = statParts(input);
          return (
            <div className={blockClasses.stat} key={stat.label}>
              <dt>{stat.label}</dt>
              <dd className={blockClasses.statValue}>
                {stat.value === '—' ? statCopy.notMeasured : stat.value}
              </dd>
              <dd className={blockClasses.statCaption}>{statCopy.over(stat.caption)}</dd>
              <dd>
                {stat.change ? (
                  // `data-tone` colours it; the word and the mark carry the
                  // meaning. Take either of those away and this becomes a green
                  // or red smudge that says nothing to a great many people.
                  <span className={blockClasses.statChange} data-tone={stat.change.tone}>
                    <span aria-hidden="true">{stat.change.mark}</span>
                    {statCopy.change(stat.change.word, stat.change.percent, stat.caption)}
                  </span>
                ) : (
                  <span className={blockClasses.statCaption}>{stat.changeAbsent}</span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
