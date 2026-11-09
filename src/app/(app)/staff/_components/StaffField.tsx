/** One box in the Add a staff member form: label above, hint and problem underneath. */
export function StaffField({
  name,
  label,
  type,
  hint,
  problem,
}: {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password';
  hint?: string;
  problem?: string;
}) {
  const id = `staff-${name}`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : '', problem ? errorId : ''].filter(Boolean).join(' ');
  return (
    <div className="staff-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={type === 'password' ? 'new-password' : 'off'}
        required
        {...(describedBy ? { 'aria-describedby': describedBy } : {})}
        {...(problem ? { 'aria-invalid': true } : {})}
      />
      {hint ? (
        <p className="staff-hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {problem ? (
        <p className="staff-error" id={errorId}>
          {problem}
        </p>
      ) : null}
    </div>
  );
}
