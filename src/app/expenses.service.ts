import { Injectable, signal } from '@angular/core';
import { supabase } from './supabase.client';
import { Category, CategoryWithSpent, Expense } from './models';

@Injectable({ providedIn: 'root' })
export class ExpensesService {
  categories = signal<CategoryWithSpent[]>([]);
  expenses = signal<Expense[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  currentMonth = signal(this.monthStart());

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const monthStart = this.currentMonth();
      const [catRes, expRes] = await Promise.all([
        supabase.from('category').select('*').order('sort_order').order('name'),
        supabase
          .from('expense')
          .select('*, category(*)')
          .gte('expense_date', this.toDateStr(monthStart))
          .lt('expense_date', this.toDateStr(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)))
          .order('expense_date', { ascending: false })
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

  async addExpense(categoryId: string, amount: number, expenseDate: string, name: string | null): Promise<void> {
    const { error } = await supabase
      .from('expense')
      .insert({ category_id: categoryId, amount, expense_date: expenseDate, name });
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

  async createCategory(name: string, max: number): Promise<void> {
    const { error } = await supabase
      .from('category')
      .insert({ name, max_monthly_amount: max });
    if (error) throw error;
    await this.load();
  }

  async updateCategory(categoryId: string, name: string, max: number): Promise<void> {
    const { error } = await supabase
      .from('category')
      .update({ name, max_monthly_amount: max })
      .eq('id', categoryId);
    if (error) throw error;
    await this.load();
  }

  async deleteCategory(categoryId: string): Promise<void> {
    const { error } = await supabase.from('category').delete().eq('id', categoryId);
    if (error) throw error;
    await this.load();
  }

  async reorder(ids: string[]): Promise<void> {
    // Atualiza sort_order de cada categoria na nova ordem
    const updates = ids.map((id, index) =>
      supabase.from('category').update({ sort_order: index }).eq('id', id),
    );
    const results = await Promise.all(updates);
    const firstError = results.find((r) => r.error)?.error;
    if (firstError) throw firstError;
    await this.load();
  }

  isCurrentMonth(): boolean {
    const now = new Date();
    const m = this.currentMonth();
    return m.getFullYear() === now.getFullYear() && m.getMonth() === now.getMonth();
  }

  shiftMonth(delta: number): void {
    const m = this.currentMonth();
    this.currentMonth.set(new Date(m.getFullYear(), m.getMonth() + delta, 1));
    this.load();
  }

  private compute(categories: Category[], expenses: Expense[]): CategoryWithSpent[] {
    const view = this.currentMonth();
    const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    const daysLeft = this.isCurrentMonth() ? daysInMonth - new Date().getDate() + 1 : 0;

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
        perDay: max > 0 && daysLeft > 0 ? remaining / daysLeft : 0,
        percent: max > 0 ? Math.min((spent / max) * 100, 100) : 0,
      };
    });
  }

  private monthStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}