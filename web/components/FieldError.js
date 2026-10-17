// Small error message shown under a form field.
export default function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <span id={id} className="field-error">
      {message}
    </span>
  );
}
