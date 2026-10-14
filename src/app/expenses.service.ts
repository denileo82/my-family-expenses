import { Injectable, signal } from '@angular/core';
import { supabase } from './supabase.client';
import { Category, CategoryWithSpent, Expense } from './models';

@Injectable({ providedIn: 'root' })
export class ExpensesService {
  categories = signal<CategoryWithSpent[]>([]);
  expenses = signal<Expense[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const monthStart = this.monthStart();
      const [catRes, expRes] = await Promise.all([
        supabase.from('category').select('*').order('id'),
        supabase
          .from('expense')
          .select('*, category(*)')
          .gte('created_at', monthStart.toISOString())
          .order('created_at', { ascending: false }),
      ]);
      if (catRes.error) throw catRes.error;
      if (expRes.error) throw expRes.error;

      const categories = (catRes.data ?? []) as Category[];
      const expenses = (expRes.data ?? []) as Expense[];
      this.expenses.set(expenses);
      this.categories.set(this.compute(categories, expenses));
    } catch (e: any) {
      this.error.set(e.message ?? 'Erro ao carregar dados');
    } finally {
      this.loading.set(false);
    }
  }

  async addExpense(categoryId: string, amount: number): Promise<void> {
    const { error } = await supabase
      .from('expense')
      .insert({ category_id: categoryId, amount, name: null });
    if (error) throw error;
    await this.load();
  }

  async deleteExpense(id: string): Promise<void> {
    const { error } = await supabase.from('expense').delete().eq('id', id);
    if (error) throw error;
    await this.load();
  }

  async updateMax(categoryId: string, max: number): Promise<void> {
    const { error } = await supabase
      .from('category')
      .update({ max_monthly_amount: max })
      .eq('id', categoryId);
    if (error) throw error;
    await this.load();
  }

  private compute(categories: Category[], expenses: Expense[]): CategoryWithSpent[] {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = daysInMonth - now.getDate() + 1;

    return categories.map((c) => {
      const spent = expenses
        .filter((e) => e.category_id === c.id)
        .reduce((sum, e) => sum + Number(e.amount), 0);
      const max = Number(c.max_monthly_amount) || 0;
      const remaining = Math.max(max - spent, 0);
      return {
        ...c,
        spent,
        remaining,
        perDay: max > 0 ? remaining / daysLeft : 0,
        percent: max > 0 ? Math.min((spent / max) * 100, 100) : 0,
      };
    });
  }

  private monthStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}