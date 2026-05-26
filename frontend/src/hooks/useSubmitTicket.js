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
      const translations = {
        'Location is outside campus boundaries.': 'Lokalizacja znajduje się poza granicami kampusu.',
        'Location is too far from selected building (max 300m).': 'Lokalizacja jest zbyt daleko od wybranego budynku (maks. 300m).'
      };

      let errorMessage = 'Wystąpił błąd podczas wysyłania zgłoszenia. Spróbuj ponownie.';
      if (error.response) {
        const { status, data } = error.response;
        if (status === 400) {
          const serverMessage = data?.error?.message;
          const details = data?.error?.details;

          if (serverMessage && serverMessage !== 'Validation failed.') {
            errorMessage = serverMessage;
          } else if (details) {
            // Extract the first field-level error
            const firstField = Object.keys(details)[0];
            const fieldErrors = details[firstField];
            if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
              errorMessage = fieldErrors[0];
            }
          } else {
            errorMessage = serverMessage || 'Błędne dane formularza. Popraw zaznaczone pola.';
          }
        } else if (status === 429) {
          errorMessage = 'Przekroczono limit zgłoszeń. Spróbuj ponownie za chwilę.';
        } else if (status >= 500) {
          errorMessage = 'Błąd serwera (500). Usługa jest w tej chwili niedostępna.';
        }
      } else if (error.request) {
        errorMessage = 'Brak odpowiedzi z serwera. Sprawdź połączenie z internetem.';
      }
      errorMessage = translations[errorMessage] || errorMessage;
      throw new Error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return { submitTicket, submitting };
}