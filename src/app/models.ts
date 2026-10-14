export interface Category {
  id: string;
  name: string;
  max_monthly_amount: number;
  created_at?: string;
}

export interface Expense {
  id: string;
  name: string | null;
  category_id: string;
  amount: number;
  expense_date: string;
  created_at: string;
  category?: Category;
}

export interface CategoryWithSpent extends Category {
  spent: number;
  remaining: number;
  perDay: number;
  percent: number;
}