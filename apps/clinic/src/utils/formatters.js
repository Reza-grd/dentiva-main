export const formatPaymentStatus = (status) => {
  if (!status) return '-';
  switch (status.toLowerCase()) {
    case 'paid':
    case 'lunas':
      return 'Lunas';
    case 'pending':
      return 'Pending';
    case 'cancelled':
      return 'Batal';
    default:
      return status;
  }
};
