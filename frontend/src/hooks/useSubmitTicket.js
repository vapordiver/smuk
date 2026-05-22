import { useState } from 'react';
import api from '../services/api';

export default function useSubmitTicket() {
  const [submitting, setSubmitting] = useState(false);

  const submitTicket = async (formData) => {
    setSubmitting(true);
    try {
      const response = await api.post('tickets/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      let errorMessage = 'Wystąpił błąd podczas wysyłania zgłoszenia. Spróbuj ponownie.';
      if (error.response) {
        const { status, data } = error.response;
        if (status === 400) {
          errorMessage = data?.error?.message || 'Błędne dane lub jesteś poza dozwolonym obszarem kampusu (Geofencing).';
        } else if (status === 429) {
          errorMessage = 'Przekroczono limit zgłoszeń. Spróbuj ponownie za chwilę.';
        } else if (status >= 500) {
          errorMessage = 'Błąd serwera (500). Usługa jest w tej chwili niedostępna.';
        }
      } else if (error.request) {
        errorMessage = 'Brak odpowiedzi z serwera. Sprawdź połączenie z internetem.';
      }
      throw new Error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return { submitTicket, submitting };
}