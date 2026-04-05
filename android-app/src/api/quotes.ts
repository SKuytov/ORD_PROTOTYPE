import { apiClient } from './client';

export interface Quote {
  id: number;
  quote_number: string;
  supplier_id?: number;
  supplier_name?: string;
  status: string;
  total_amount?: number;
  currency?: string;
  valid_until?: string;
  notes?: string;
  created_at: string;
  items?: QuoteItem[];
}

export interface QuoteItem {
  id: number;
  order_id: number;
  item_description?: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  building?: string;
}

export async function getQuotes(): Promise<Quote[]> {
  const res = await apiClient.get<{ success: boolean; quotes: Quote[] }>('/quotes');
  return res.quotes || [];
}

export async function getQuoteById(id: number): Promise<Quote> {
  const res = await apiClient.get<{ success: boolean; quote: Quote }>(`/quotes/${id}`);
  return res.quote;
}

export async function createQuote(data: {
  order_ids: number[];
  supplier_id: number;
  notes?: string;
  currency?: string;
}): Promise<{ quoteId: number }> {
  const res = await apiClient.post<{ success: boolean; quoteId: number }>('/quotes', data);
  return { quoteId: res.quoteId };
}

export async function updateQuoteStatus(id: number, status: string): Promise<void> {
  await apiClient.put(`/quotes/${id}`, { status });
}
