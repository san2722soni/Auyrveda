const numberFormatter = new Intl.NumberFormat("en-IN");

const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatDateTime(value?: string): string {
  if (!value) {
    return "Not available";
  }

  return dateTimeFormatter.format(new Date(value));
}

export function formatDate(value?: string): string {
  if (!value) {
    return "Not available";
  }

  return dateFormatter.format(new Date(value));
}
