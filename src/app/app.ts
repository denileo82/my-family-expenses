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

  // Modal de nova despesa
  expenseModalOpen = signal(false);
  selectedId = signal<string | null>(null);
  amount = signal('');
  date = signal(this.todayStr());
  description = signal('');
  saving = signal(false);
  saveError = signal<string | null>(null);
  private amountInput = viewChild<ElementRef<HTMLInputElement>>('amountBox');

  // Modal de categorias
  categoriesModalOpen = signal(false);
  editingCategoryId = signal<string | null>(null); // null = nova categoria
  catName = signal('');
  catMax = signal('');
  catSaving = signal(false);
  catError = signal<string | null>(null);

  selected = computed<CategoryWithSpent | null>(() =>
    this.categories().find((c) => c.id === this.selectedId()) ?? null,
  );

  totalSpent = computed(() => this.expenses().reduce((s, e) => s + Number(e.amount), 0));

  constructor() {
    this.service.load();
  }

  // ===== Despesa =====
  openExpenseModal(id: string): void {
    this.selectedId.set(id);
    this.amount.set('');
    this.date.set(this.todayStr());
    this.description.set('');
    this.saveError.set(null);
    this.expenseModalOpen.set(true);
    setTimeout(() => this.amountInput()?.nativeElement.focus());
  }

  closeExpenseModal(): void {
    this.expenseModalOpen.set(false);
  }

  async add(): Promise<void> {
    const id = this.selectedId();
    const value = Number(this.amount().replace(',', '.'));
    if (!id || !value || value <= 0) return;
    this.saving.set(true);
    this.saveError.set(null);
    try {
      await this.service.addExpense(id, value, this.date(), this.description().trim() || null);
      this.expenseModalOpen.set(false);
    } catch (e: any) {
      this.saveError.set(e.message ?? 'Erro ao salvar');
    } finally {
      this.saving.set(false);
    }
  }

  async remove(id: string): Promise<void> {
    await this.service.deleteExpense(id);
  }

  // ===== Categorias =====
  openCategoriesModal(): void {
    this.editingCategoryId.set(null);
    this.catError.set(null);
    this.categoriesModalOpen.set(true);
  }

  closeCategoriesModal(): void {
    this.categoriesModalOpen.set(false);
  }

  startEditCategory(id: string | null): void {
    this.editingCategoryId.set(id);
    this.catError.set(null);
    if (id) {
      const c = this.categories().find((x) => x.id === id);
      this.catName.set(c?.name ?? '');
      this.catMax.set(c?.max_monthly_amount ? String(c.max_monthly_amount) : '');
    } else {
      this.catName.set('');
      this.catMax.set('');
    }
  }

  async saveCategory(): Promise<void> {
    const name = this.catName().trim();
    if (!name) {
      this.catError.set('Informe o nome da categoria');
      return;
    }
    const max = Number(this.catMax().replace(',', '.')) || 0;
    this.catSaving.set(true);
    this.catError.set(null);
    try {
      const id = this.editingCategoryId();
      if (id) {
        await this.service.updateCategory(id, name, max);
      } else {
        await this.service.createCategory(name, max);
      }
      this.editingCategoryId.set(null);
    } catch (e: any) {
      this.catError.set(e.message ?? 'Erro ao salvar');
    } finally {
      this.catSaving.set(false);
    }
  }

  async deleteCategory(id: string): Promise<void> {
    if (!confirm('Excluir categoria e todas as suas despesas?')) return;
    try {
      await this.service.deleteCategory(id);
      this.editingCategoryId.set(null);
    } catch (e: any) {
      this.catError.set(e.message ?? 'Erro ao excluir');
    }
  }

  // ===== Helpers =====
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

  private todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}