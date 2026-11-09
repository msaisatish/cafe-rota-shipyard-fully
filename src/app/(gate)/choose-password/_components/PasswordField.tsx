/** One password box with its label above and its problem underneath. */
export function PasswordField({
  name,
  label,
  problem,
}: {
  name: string;
  label: string;
  problem?: string;
}) {
  const id = `choose-${name}`;
  const errorId = `${id}-error`;
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        type="password"
        autoComplete="new-password"
        required
        {...(problem ? { 'aria-invalid': true, 'aria-describedby': errorId } : {})}
      />
      {problem ? (
        <p className="auth-error" id={errorId}>
          {problem}
        </p>
      ) : null}
    </div>
  );
}
