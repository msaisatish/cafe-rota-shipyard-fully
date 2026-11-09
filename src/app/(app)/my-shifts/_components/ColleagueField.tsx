import type { StaffChoice } from '@/lib/rota/plan';

/** The Colleague select in the Ask to swap dialog. */
export function ColleagueField({
  colleagues,
  hasProblem,
}: {
  colleagues: readonly StaffChoice[];
  hasProblem: boolean;
}) {
  return (
    <div className="my-shifts-field">
      <label htmlFor="swap-colleague">Colleague</label>
      <select
        id="swap-colleague"
        name="toMemberId"
        required
        defaultValue=""
        {...(hasProblem ? { 'aria-invalid': true } : {})}
      >
        <option value="">Choose a colleague</option>
        {colleagues.map((colleague) => (
          <option key={colleague.id} value={colleague.id}>
            {colleague.name}
          </option>
        ))}
      </select>
    </div>
  );
}
