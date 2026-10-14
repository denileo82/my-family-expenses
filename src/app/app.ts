import { Component, computed, inject, signal, viewChild, ElementRef } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ExpensesService } from './expenses.service';
import { CategoryWithSpent } from './models';

@Component({
  selector: 'app-root',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private service = inject(ExpensesService);

  categories = this.service.categories;
  expenses = this.service.expenses;
  loading = this.service.loading;
  error = this.service.error;

  selectedId = signal<string | null>(null);
  private amountInput = viewChild<ElementRef<HTMLInputElement>>('amountBox');
  amount = signal('');
  date = signal(this.todayStr());
  saving = signal(false);
  saveError = signal<string | null>(null);
  editingMaxId = signal<string | null>(null);
  maxValue = signal('');

  selected = computed<CategoryWithSpent | null>(() =>
    this.categories().find((c) => c.id === this.selectedId()) ?? null,
  );

  totalSpent = computed(() => this.expenses().reduce((s, e) => s + Number(e.amount), 0));

  constructor() {
    this.service.load();
  }

  select(id: string): void {
    this.selectedId.set(id);
    this.saveError.set(null);
    // Foca a caixa de valor após a renderização
    setTimeout(() => {
      const input = this.amountInput()?.nativeElement;
      input?.focus();
      input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  onAmountInput(value: string): void {
    this.amount.set(value);
  }

  async add(): Promise<void> {
    const id = this.selectedId();
    const value = Number(this.amount().replace(',', '.'));
    if (!id || !value || value <= 0) return;
    this.saving.set(true);
    this.saveError.set(null);
    try {
      await this.service.addExpense(id, value, this.date());
      this.amount.set('');
      this.date.set(this.todayStr());
    } catch (e: any) {
      this.saveError.set(e.message ?? 'Erro ao salvar');
    } finally {
      this.saving.set(false);
    }
  }

  private todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  async remove(id: string): Promise<void> {
    await this.service.deleteExpense(id);
  }

  startEditMax(c: CategoryWithSpent): void {
    this.editingMaxId.set(c.id);
    this.maxValue.set(c.max_monthly_amount ? String(c.max_monthly_amount) : '');
  }

  async saveMax(): Promise<void> {
    const id = this.editingMaxId();
    if (!id) return;
    const max = Number(this.maxValue().replace(',', '.')) || 0;
    await this.service.updateMax(id, max);
    this.editingMaxId.set(null);
  }

  cancelEditMax(): void {
    this.editingMaxId.set(null);
  }

  barColor(c: CategoryWithSpent): string {
    if (c.max_monthly_amount <= 0) return 'bg-gray-300';
    if (c.percent >= 100) return 'bg-red-500';
    if (c.percent >= 70) return 'bg-yellow-400';
    return 'bg-emerald-500';
  }

  statusColor(c: CategoryWithSpent): string {
    if (c.max_monthly_amount <= 0) return 'text-gray-400';
    if (c.percent >= 100) return 'text-red-600';
    if (c.percent >= 70) return 'text-yellow-600';
    return 'text-emerald-600';
  }
}