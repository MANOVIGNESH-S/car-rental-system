// Change this line to use the default import and name it 'apiClient'
import apiClient from "../../../lib/axios"; 
import  type {
  BookingListItem,
  BookingDetail,
  CreateBookingRequest,
  BookingStatus,
} from "../../../types/index";

export interface BookingPaymentInfo {
  payment_id: string;
  transaction_type: string;
  amount: string;
  payment_method: "UPI" | "card" | "cash";
  status: string;
  mock_transaction_id: string;
  timestamp: string;
}

export interface CreateBookingResponse {
  booking_id: string;
  status: BookingStatus;
  start_time: string;
  end_time: string;
  rental_fee: string;
  security_deposit: string;
  total_price: string;
  payment: BookingPaymentInfo;
}

export const createBooking = async (
  data: CreateBookingRequest
): Promise<CreateBookingResponse> => {
  const response = await apiClient.post<CreateBookingResponse>("/bookings/", data);
  return response.data;
};

export const getMyBookings = async (params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<BookingListItem[]> => {
  const response = await apiClient.get<BookingListItem[]>("/bookings/", {
    params,
  });
  return response.data;
};

export const getBookingById = async (
  bookingId: string
): Promise<BookingDetail> => {
  const response = await apiClient.get<BookingDetail>(`/bookings/${bookingId}`);
  return response.data;
};

export const cancelBooking = async (bookingId: string): Promise<void> => {
  await apiClient.delete(`/bookings/${bookingId}`);
};