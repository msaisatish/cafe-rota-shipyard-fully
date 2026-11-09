'use client';

import Link from 'next/link';

import { Button } from '@/components/ui_foundation/Button';
import { Status } from '@/components/ui_foundation/Status';
import { buttonProps } from '@/components/ui_foundation/primitives';
import type { WeekPlan } from '@/lib/rota/plan';

const quietLink = buttonProps({ tone: 'quiet' }).className;

function WeekSwitcher({ plan }: { plan: WeekPlan }) {
  return (
    <div className="week-switcher">
      <Link
        className={quietLink}
        href={`/week?week=${plan.previousWeek}`}
        aria-label="Previous week"
        title="Previous week"
      >
        <span aria-hidden="true">←</span>
      </Link>
      <p className="week-label">{plan.label}</p>
      <Link
        className={quietLink}
        href={`/week?week=${plan.nextWeek}`}
        aria-label="Next week"
        title="Next week"
      >
        <span aria-hidden="true">→</span>
      </Link>
      {plan.isPublished ? (
        <Status tone="ok" label="Published" />
      ) : (
        <Status tone="warn" label="Draft – staff can't see this yet" />
      )}
    </div>
  );
}

/**
 * Title, week switcher and the two actions. Publish is hidden once the week is
 * published, and only becomes the primary style once there is something to publish.
 */
export function WeekHeader({
  plan,
  onAdd,
  onPublish,
}: {
  plan: WeekPlan;
  onAdd: (() => void) | null;
  onPublish: () => void;
}) {
  const hasShifts = plan.shifts.length > 0;
  return (
    <div className="week-head">
      <div className="week-title">
        <h1>Plan the week</h1>
        <div className="week-actions">
          {onAdd ? (
            <Button tone="primary" onClick={onAdd}>
              Add a shift
            </Button>
          ) : null}
          {plan.isPublished ? null : (
            <Button
              tone={hasShifts ? 'primary' : 'quiet'}
              disabled={!hasShifts}
              onClick={onPublish}
            >
              Publish this week
            </Button>
          )}
        </div>
      </div>
      <WeekSwitcher plan={plan} />
      {plan.isPublished ? <p className="week-note">Staff see changes straight away.</p> : null}
    </div>
  );
}
