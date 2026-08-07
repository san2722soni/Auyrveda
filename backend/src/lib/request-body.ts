export function hasOnlyBooleanProperty<TProperty extends string>(
  body: unknown,
  property: TProperty
): body is Record<TProperty, boolean> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return false;
  }

  const keys = Object.keys(body);

  return (
    keys.length === 1 &&
    keys[0] === property &&
    typeof (body as Record<TProperty, unknown>)[property] === "boolean"
  );
}

export function isNonEmptyStringWithinLimit(
  value: unknown,
  maxLength: number
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maxLength
  );
}
