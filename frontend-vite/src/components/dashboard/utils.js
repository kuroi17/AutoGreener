export const formatDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const formatTimeInput = (date) => {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

export const formatTimeInputCeil = (date) => {
  const rounded = new Date(date);

  if (
    rounded.getSeconds() > 0 ||
    rounded.getMilliseconds() > 0
  ) {
    rounded.setMinutes(rounded.getMinutes() + 1, 0, 0);
  }

  return formatTimeInput(rounded);
};

export const clampIntegerString = (value, minimum, maximum) => {
  const digitsOnly = String(value || "").replace(/\D/g, "");
  if (!digitsOnly) {
    return String(minimum);
  }

  const bounded = Math.min(
    Math.max(Number(digitsOnly) || minimum, minimum),
    maximum,
  );

  return String(bounded);
};
