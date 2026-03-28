import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBooking as createBookingService, type CreateBookingResponse } from '../services/bookingService';
import { type CreateBookingRequest } from '../../../types/index';

export const useCreateBooking = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<CreateBookingResponse | null>(null);

  const submitBooking = async (data: CreateBookingRequest): Promise<void> => {
    setError(null);

    // 1. Validation Logic
    // data.start_time comes in exactly as the input value: "YYYY-MM-DDThh:mm"
    const startStr = data.start_time;
    const endStr = data.end_time;

    // Extract hours directly from the string to prevent timezone shifts
    const startHour = parseInt(startStr.substring(11, 13), 10);
    const endHour = parseInt(endStr.substring(11, 13), 10);
    const endMinutes = parseInt(endStr.substring(14, 16), 10);

    const start = new Date(startStr);
    const end = new Date(endStr);
    const now = new Date();

    // Duration in milliseconds
    const durationMs = end.getTime() - start.getTime();
    const oneHourMs = 60 * 60 * 1000;
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
    const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;

    // Rule: Booking hours 9AM to 6PM (18:00)
    if (startHour < 9 || startHour >= 18) {
      setError('Pick-up must be between 09:00 AM and 05:59 PM.');
      return;
    }

    // Rule: End must be before or at 18:00
    if (endHour > 18 || (endHour === 18 && endMinutes > 0)) {
      setError('Drop-off must be no later than 06:00 PM.');
      return;
    }

    // Rule: Min booking duration 1 hour
    if (durationMs < oneHourMs) {
      setError('Minimum booking duration is 1 hour.');
      return;
    }

    // Rule: Max booking duration 14 days
    if (durationMs > fourteenDaysMs) {
      setError('Maximum booking duration is 14 days.');
      return;
    }

    // Rule: Max advance booking 60 days
    if (start.getTime() - now.getTime() > sixtyDaysMs) {
      setError('Bookings can only be made up to 60 days in advance.');
      return;
    }

    // 2. Format Payload exactly as Backend expects ("YYYY-MM-DDThh:mm:00.000Z")
    setIsLoading(true);
    try {
      const formatForBackend = (localDateTimeStr: string) => {
        // If it's a standard datetime-local string (length 16), append seconds and Z
        if (localDateTimeStr.length === 16) {
          return `${localDateTimeStr}:00.000Z`;
        }
        return localDateTimeStr;
      };

      const payload: CreateBookingRequest = {
        ...data,
        start_time: formatForBackend(startStr),
        end_time: formatForBackend(endStr)
      };

      const response = await createBookingService(payload);
      setSuccessData(response);
      navigate(`/portal/bookings/${response.booking_id}`);
    } catch (err) {
      const e = err as { 
        response?: { 
          data?: { 
            message?: string; 
            detail?: string | Array<{ msg: string }>; 
          } 
        } 
      };
      
      const resData = e.response?.data;
      let serverError = 'Failed to create booking. Please try again.';

      if (resData) {
        if (typeof resData.detail === 'string') {
          serverError = resData.detail;
        } else if (Array.isArray(resData.detail) && resData.detail.length > 0) {
          serverError = resData.detail[0].msg;
        } else if (resData.message) {
          serverError = resData.message;
        }
      }

      setError(serverError);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    submitBooking,
    isLoading,
    error,
    successData,
  };
};