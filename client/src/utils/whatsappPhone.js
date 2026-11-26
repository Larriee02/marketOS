// Local numbers use Nigeria's dialing rules until shops have a country setting.
export function whatsappPhone(phone) {
  const raw = String(phone ?? '').trim();
  const digits = raw.replace(/\D/g, '');
  if (raw.startsWith('+')) return digits;
  if (digits.startsWith('00')) return digits.slice(2);
  if (/^0[1-9]\d{9}$/.test(digits)) return '234' + digits.slice(1);
  if (/^[1-9]\d{9}$/.test(digits)) return '234' + digits;
  return digits;
}
