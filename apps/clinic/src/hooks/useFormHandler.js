import { useState } from 'react';
import { useToast } from '../components/common/ToastNotification';

export function useFormHandler(submitFn, onSuccess, errorMessage = 'Gagal menyimpan data') {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const toast = useToast();

  const handleSubmit = async (data) => {
    setIsSubmitting(true);
    setServerError(null);
    try {
      const result = await submitFn(data);
      if (result?.success || result) {
        toast.success('Berhasil disimpan');
        if (onSuccess) onSuccess(result?.data || result);
        return true;
      } else {
        const err = result?.error || errorMessage;
        setServerError(err);
        toast.error(err);
        return false;
      }
    } catch (error) {
      setServerError(error.message);
      toast.error(errorMessage);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { isSubmitting, serverError, handleSubmit };
}
