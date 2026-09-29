// Resolves a human-readable label for a related resource record, covering the
// common naming shapes used across the API (name, firstname/lastname, title,
// username, ...) instead of falling back to `#id`.
export const relatedItemLabel = (item: any, displayField?: string): string => {
  if (item === null || item === undefined) return '';
  if (typeof item === 'string' || typeof item === 'number') return String(item);

  if (displayField && item[displayField]) return String(item[displayField]);
  if (item.name) return String(item.name);

  const first = item.firstname || item.first_name || '';
  const last = item.lastname || item.last_name || '';
  const full = `${first} ${last}`.trim();
  if (full) return full;

  if (item.title) return String(item.title);
  if (item.username) return String(item.username);
  if (item.label) return String(item.label);
  if (item.email) return String(item.email);

  return `#${item.id}`;
};

export default relatedItemLabel;
