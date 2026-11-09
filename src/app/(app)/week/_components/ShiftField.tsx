export interface ShiftOption {
  value: string;
  label: string;
}

/**
 * One box in the Add a shift form: label above, the problem underneath. A time
 * box when there are no options, otherwise a select; `prompt` is its empty first choice.
 */
export function ShiftField({
  name,
  label,
  problem,
  options,
  prompt,
}: {
  name: string;
  label: string;
  problem?: string;
  options?: readonly ShiftOption[];
  prompt?: string;
}) {
  const id = `shift-${name}`;
  const errorId = `${id}-error`;
  const control = {
    id,
    name,
    required: true,
    ...(problem ? { 'aria-describedby': errorId, 'aria-invalid': true } : {}),
  };
  return (
    <div className="week-field">
      <label htmlFor={id}>{label}</label>
      {options ? (
        <select {...control} defaultValue={prompt ? '' : options[0]?.value}>
          {prompt ? <option value="">{prompt}</option> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input {...control} type="time" step={60} />
      )}
      {problem ? (
        <p className="week-error" id={errorId}>
          {problem}
        </p>
      ) : null}
    </div>
  );
}
