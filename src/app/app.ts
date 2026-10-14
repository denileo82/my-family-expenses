import { Component, computed, effect, inject, signal, viewChild, ElementRef } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { ExpensesService } from './expenses.service';
import { AuthService } from './auth.service';
import { CategoryWithSpent } from './models';

@Component({
  selector: 'app-root',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, TitleCasePipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private service = inject(ExpensesService);
  private auth = inject(AuthService);

  // Auth
  session = this.auth.session;
  initializing = this.auth.initializing;
  email = signal('');
  password = signal('');
  authMode = signal<'login' | 'signup'>('login');
  authBusy = signal(false);
  authError = signal<string | null>(null);
  authMessage = signal<string | null>(null);

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
  catFormOpen = signal(false);
  editingCategoryId = signal<string | null>(null); // null = nova categoria
  catName = signal('');
  catMax = signal('');
  catSaving = signal(false);
  catError = signal<string | null>(null);

  selected = computed<CategoryWithSpent | null>(() =>
    this.categories().find((c) => c.id === this.selectedId()) ?? null,
  );

  totalSpent = computed(() => this.expenses().reduce((s, e) => s + Number(e.amount), 0));
  totalLimit = computed(() => this.categories().reduce((s, c) => s + (Number(c.max_monthly_amount) || 0), 0));
  totalPercent = computed(() => {
    const limit = this.totalLimit();
    return limit > 0 ? Math.min((this.totalSpent() / limit) * 100, 100) : 0;
  });

  monthLabel = computed(() => {
    const m = this.service.currentMonth();
    return m.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  });

  isCurrentMonth = computed(() => this.service.isCurrentMonth());

  prevMonth(): void {
    this.service.shiftMonth(-1);
  }

  nextMonth(): void {
    this.service.shiftMonth(1);
  }

  constructor() {
    // Carrega os dados quando houver sessão (e recarrega ao logar)
    effect(() => {
      if (this.session()) {
        this.service.load();
      }
    });
  }

  async submitAuth(): Promise<void> {
    const email = this.email().trim();
    const password = this.password();
    if (!email || !password) return;
    this.authBusy.set(true);
    this.authError.set(null);
    this.authMessage.set(null);
    try {
      if (this.authMode() === 'signup') {
        await this.auth.signUp(email, password);
        this.authMessage.set('Cadastro criado! Verifique seu e-mail para confirmar (se necessário) e faça login.');
        this.authMode.set('login');
      } else {
        await this.auth.signIn(email, password);
      }
    } catch (e: any) {
      this.authError.set(e.message ?? 'Erro de autenticação');
    } finally {
      this.authBusy.set(false);
    }
  }

  async logout(): Promise<void> {
    await this.auth.signOut();
  }

  toggleAuthMode(): void {
    this.authMode.set(this.authMode() === 'login' ? 'signup' : 'login');
    this.authError.set(null);
    this.authMessage.set(null);
  }

  // ===== Despesa =====
  openExpenseModal(id: string): void {
    this.selectedId.set(id);
    this.amount.set('');
    this.date.set(this.todayStr());
    this.description.set('');
    this.saveError.set(null);
    this.expenseModalOpen.set(true);
    // Foco síncrono: o iOS só abre o teclado dentro do gesto do usuário.
    // O modal está sempre no DOM (escondido via CSS), então o input já existe.
    this.amountInput()?.nativeElement.focus();
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
    if (!confirm('Excluir este lançamento?')) return;
    await this.service.deleteExpense(id);
  }

  // ===== Categorias =====
  openCategoriesModal(): void {
    this.catFormOpen.set(false);
    this.catError.set(null);
    this.categoriesModalOpen.set(true);
  }

  closeCategoriesModal(): void {
    this.categoriesModalOpen.set(false);
  }

  startEditCategory(id: string | null): void {
    this.catFormOpen.set(true);
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

  closeCatForm(): void {
    this.catFormOpen.set(false);
    this.catError.set(null);
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
      this.catFormOpen.set(false);
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
      this.catFormOpen.set(false);
    } catch (e: any) {
      this.catError.set(e.message ?? 'Erro ao excluir');
    }
  }

  // ===== Drag & drop de categorias (Pointer Events: funciona em touch e mouse) =====
  dragIndex = signal<number | null>(null);
  dragOverIndex = signal<number | null>(null);

  startDrag(e: PointerEvent, index: number): void {
    e.preventDefault();
    this.dragIndex.set(index);
    this.dragOverIndex.set(index);

    const move = (ev: PointerEvent) => {
      const el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
      const li = el?.closest('[data-cat-index]');
      if (li) this.dragOverIndex.set(Number(li.getAttribute('data-cat-index')));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      this.commitDrag(this.dragOverIndex());
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  private commitDrag(index: number | null): void {
    const from = this.dragIndex();
    this.dragIndex.set(null);
    this.dragOverIndex.set(null);
    if (from === null || index === null || from === index) return;
    const list = [...this.categories()];
    const [moved] = list.splice(from, 1);
    list.splice(index, 0, moved);
    // Atualiza localmente para feedback imediato
    this.categories.set(list.map((c, i) => ({ ...c, sort_order: i })));
    this.service.reorder(list.map((c) => c.id)).catch(() => this.service.load());
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