export const formatKES = (amount: number | string) => {
  const num = parseFloat(String(amount)) || 0;
  return `KES ${num.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatDate = (date: string | Date, p0?: { time: boolean; }) => {
  return new Date(date).toLocaleString('en-KE', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

export const formatPhone = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('254') && cleaned.length === 12) {
    return `+${cleaned.slice(0,3)} ${cleaned.slice(3,6)} ${cleaned.slice(6,9)} ${cleaned.slice(9)}`;
  }
  return phone;
};
