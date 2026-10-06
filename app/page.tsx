"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type IncomeRow = {
  id: string;
  amount: number | string;
  income_date: string;
  description: string | null;
  note: string | null;
  category_id: string | null;
};

type ExpenseRow = {
  id: string;
  amount: number | string;
  expense_date: string;
  description: string | null;
  note: string | null;
  category_id: string | null;
};

type Category = {
  id: string;
  name: string;
  parent_id: string | null;
};

type MonthlyBudgetRow = {
  id: string;
  category_id: string;
  budget_month: string;
  amount: number | string;
  note: string | null;
};

type DebtSummaryRow = {
  id: string;
  debt_type: "owed_by_me" | "owed_to_me";
  transaction_type: "personal" | "work";
  party_name: string;
  description: string | null;
  original_amount: number | string;
  paid_amount: number | string;
  remaining_amount: number | string;
  debt_date: string;
  due_date: string | null;
  calculated_status: "active" | "partially_paid" | "paid";
  note: string | null;
};

type Transaction = {
  id: string;
  type: "income" | "expense";
  amount: number;
  date: string;
  description: string;
  note: string | null;
  categoryName: string;
};

type SupabaseError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

function getLocalDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatMoney(value: number) {
  return `${new Intl.NumberFormat("ar-DZ", {
    maximumFractionDigits: 2,
  }).format(value)} دج`;
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("ar-DZ", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(`${value}T12:00:00`));
  } catch {
    return value;
  }
}

function getMonthStart() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}-01`;
}

function getNextMonthStart() {
  const now = new Date();

  const year = now.getFullYear();
  const month = now.getMonth();

  const nextMonth = new Date(year, month + 1, 1);

  const nextYear = nextMonth.getFullYear();
  const nextMonthNumber = String(nextMonth.getMonth() + 1).padStart(
    2,
    "0"
  );

  return `${nextYear}-${nextMonthNumber}-01`;
}

function getCurrentMonthLabel() {
  const now = new Date();

  return new Intl.DateTimeFormat("ar-DZ", {
    month: "long",
    year: "numeric",
  }).format(now);
}

/* =========================
   Icons
========================= */

type IconProps = {
  className?: string;
};

function WalletIcon({ className }: IconProps) {
  return (
    <svg
      className={className || "h-6 w-6"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H20v14H5.5A2.5 2.5 0 0 1 3 16.5v-9Z" />
      <path d="M3 8h17" />
      <path d="M16 13h4" />
      <circle cx="16" cy="13" r=".6" fill="currentColor" />
    </svg>
  );
}

function IncomeIcon({ className }: IconProps) {
  return (
    <svg
      className={className || "h-6 w-6"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 19V5" />
      <path d="m6.5 10.5 5.5-5.5 5.5 5.5" />
      <path d="M4 19h16" />
    </svg>
  );
}

function ExpenseIcon({ className }: IconProps) {
  return (
    <svg
      className={className || "h-6 w-6"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 5v14" />
      <path d="m17.5 13.5-5.5 5.5-5.5-5.5" />
      <path d="M4 5h16" />
    </svg>
  );
}

function TrendingIcon({ className }: IconProps) {
  return (
    <svg
      className={className || "h-6 w-6"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M3 17 9 11l4 4 8-8" />
      <path d="M15 7h6v6" />
    </svg>
  );
}

function ChartIcon({ className }: IconProps) {
  return (
    <svg
      className={className || "h-6 w-6"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 19V5" />
      <path d="M4 19h17" />
      <path d="M8 16v-4" />
      <path d="M12 16V8" />
      <path d="M16 16V6" />
      <path d="M20 16v-7" />
    </svg>
  );
}

function ArrowLeftIcon({ className }: IconProps) {
  return (
    <svg
      className={className || "h-5 w-5"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function PlusIcon({ className }: IconProps) {
  return (
    <svg
      className={className || "h-5 w-5"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function RefreshIcon({ className }: IconProps) {
  return (
    <svg
      className={className || "h-5 w-5"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M20 11a8 8 0 0 0-14.9-3" />
      <path d="M4 5v4h4" />
      <path d="M4 13a8 8 0 0 0 14.9 3" />
      <path d="M20 19v-4h-4" />
    </svg>
  );
}

function ReceiptIcon({ className }: IconProps) {
  return (
    <svg
      className={className || "h-5 w-5"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  );
}

function CalendarIcon({ className }: IconProps) {
  return (
    <svg
      className={className || "h-5 w-5"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  );
}

function AlertIcon({ className }: IconProps) {
  return (
    <svg
      className={className || "h-5 w-5"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 3 2.8 20h18.4L12 3Z" />
      <path d="M12 9v5" />
      <circle cx="12" cy="17" r=".7" fill="currentColor" />
    </svg>
  );
}

function CheckIcon({ className }: IconProps) {
  return (
    <svg
      className={className || "h-5 w-5"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function DebtIcon({ className }: IconProps) {
  return (
    <svg
      className={className || "h-6 w-6"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 9h10M7 13h4M15 13h2" />
      <path d="M7 17h10" />
    </svg>
  );
}

/* =========================
   Dashboard
========================= */

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [userEmail, setUserEmail] = useState("");

  const [incomes, setIncomes] = useState<IncomeRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>(
    []
  );

  const [monthlyBudgets, setMonthlyBudgets] = useState<
    MonthlyBudgetRow[]
  >([]);

  const [debts, setDebts] = useState<DebtSummaryRow[]>([]);

  const [error, setError] = useState("");

  async function loadDashboard(showRefresh = false) {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUserEmail(user.email || "");

      const monthStart = getMonthStart();

      const [
        incomesResult,
        expensesResult,
        incomeCategoriesResult,
        expenseCategoriesResult,
        budgetsResult,
        debtsResult,
      ] = await Promise.all([
        supabase
          .from("incomes")
          .select(
            "id, amount, income_date, description, note, category_id"
          )
          .eq("user_id", user.id)
          .order("income_date", { ascending: false }),

        supabase
          .from("expenses")
          .select(
            "id, amount, expense_date, description, note, category_id"
          )
          .eq("user_id", user.id)
          .order("expense_date", { ascending: false }),

        supabase
          .from("income_categories")
          .select("id, name")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("name", { ascending: true }),

        supabase
          .from("expense_categories")
          .select("id, name, parent_id")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("name", { ascending: true }),

        supabase
          .from("monthly_budgets")
          .select(
            "id, category_id, budget_month, amount, note"
          )
          .eq("user_id", user.id)
          .eq("budget_month", monthStart),

        supabase
          .from("debt_summary")
          .select(
            "id, debt_type, transaction_type, party_name, description, original_amount, paid_amount, remaining_amount, debt_date, due_date, calculated_status, note"
          )
          .eq("user_id", user.id)
          .order("debt_date", { ascending: false }),
      ]);

      const failedQueries: Array<{
        name: string;
        error: SupabaseError;
      }> = [];

      const registerQueryError = (
        name: string,
        queryError: SupabaseError | null
      ) => {
        if (queryError) {
          failedQueries.push({
            name,
            error: queryError,
          });
        }
      };

      registerQueryError("المداخيل (incomes)", incomesResult.error);
      registerQueryError("المصاريف (expenses)", expensesResult.error);
      registerQueryError(
        "تصنيفات المداخيل (income_categories)",
        incomeCategoriesResult.error
      );
      registerQueryError(
        "تصنيفات المصاريف (expense_categories)",
        expenseCategoriesResult.error
      );
      registerQueryError(
        "الميزانية الشهرية (monthly_budgets)",
        budgetsResult.error
      );
      registerQueryError(
        "ملخص الديون (debt_summary)",
        debtsResult.error
      );

      if (failedQueries.length > 0) {
        const firstFailure = failedQueries[0];
        const queryError = firstFailure.error;

        const technicalDetails = [
          queryError.message,
          queryError.code ? `الكود: ${queryError.code}` : "",
          queryError.details ? `التفاصيل: ${queryError.details}` : "",
          queryError.hint ? `اقتراح Supabase: ${queryError.hint}` : "",
        ]
          .filter(Boolean)
          .join(" | ");

        console.error("Dashboard query failed", {
          query: firstFailure.name,
          message: queryError.message,
          code: queryError.code,
          details: queryError.details,
          hint: queryError.hint,
          allFailedQueries: failedQueries.map((item) => ({
            query: item.name,
            message: item.error.message,
            code: item.error.code,
            details: item.error.details,
            hint: item.error.hint,
          })),
        });

        const dashboardError: SupabaseError = {
          message: `فشل تحميل ${firstFailure.name}. ${
            technicalDetails ||
            "تحقق من جدول قاعدة البيانات وسياسات RLS والاتصال بـ Supabase."
          }`,
          code: queryError.code,
          details: queryError.details,
          hint: queryError.hint,
        };

        throw dashboardError;
      }

      setIncomes((incomesResult.data ?? []) as IncomeRow[]);
      setExpenses((expensesResult.data ?? []) as ExpenseRow[]);

      setIncomeCategories(
        (incomeCategoriesResult.data ?? []) as Category[]
      );

      setExpenseCategories(
        (expenseCategoriesResult.data ?? []) as Category[]
      );

      setMonthlyBudgets(
        (budgetsResult.data ?? []) as MonthlyBudgetRow[]
      );

      setDebts((debtsResult.data ?? []) as DebtSummaryRow[]);
    } catch (err) {
      const supabaseError = err as SupabaseError;

      const safeError = {
        message: supabaseError?.message || "خطأ غير معروف",
        code: supabaseError?.code || "",
        details: supabaseError?.details || "",
        hint: supabaseError?.hint || "",
      };

      console.error("Dashboard error:", safeError);

      const message = [
        safeError.message,
        safeError.code ? `الكود: ${safeError.code}` : "",
        safeError.details ? `التفاصيل: ${safeError.details}` : "",
        safeError.hint ? `الاقتراح: ${safeError.hint}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      setError(
        message ||
          "النظام يتعذر عليه تحميل البيانات. تحقق من الاتصال بقاعدة البيانات."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  /* =========================
     Category maps
  ========================= */

  const incomeCategoryMap = useMemo(() => {
    return new Map(
      incomeCategories.map((category) => [category.id, category.name])
    );
  }, [incomeCategories]);

  const expenseCategoryMap = useMemo(() => {
    return new Map(
      expenseCategories.map((category) => [category.id, category])
    );
  }, [expenseCategories]);

  /* =========================
     Totals
  ========================= */

  const totalIncome = useMemo(() => {
    return incomes.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [incomes]);

  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [expenses]);

  const balance = totalIncome - totalExpenses;

  const monthStart = getMonthStart();
  const today = getLocalDate();
  const nextMonthStart = getNextMonthStart();

  const monthlyIncome = useMemo(() => {
    return incomes
      .filter(
        (item) =>
          item.income_date >= monthStart && item.income_date <= today
      )
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [incomes, monthStart, today]);

  const monthlyExpenses = useMemo(() => {
    return expenses
      .filter(
        (item) =>
          item.expense_date >= monthStart && item.expense_date <= today
      )
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [expenses, monthStart, today]);

  const monthlyNet = monthlyIncome - monthlyExpenses;

  /* =========================
     Debts
  ========================= */

  const debtStats = useMemo(() => {
    const todayDate = getLocalDate();

    const activeDebts = debts.filter(
      (debt) =>
        debt.calculated_status === "active" ||
        debt.calculated_status === "partially_paid"
    );

    const owedByMe = activeDebts
      .filter((debt) => debt.debt_type === "owed_by_me")
      .reduce(
        (sum, debt) => sum + Number(debt.remaining_amount || 0),
        0
      );

    const owedToMe = activeDebts
      .filter((debt) => debt.debt_type === "owed_to_me")
      .reduce(
        (sum, debt) => sum + Number(debt.remaining_amount || 0),
        0
      );

    const overdueDebts = activeDebts.filter(
      (debt) =>
        debt.due_date &&
        debt.due_date < todayDate &&
        Number(debt.remaining_amount || 0) > 0
    );

    return {
      activeCount: activeDebts.length,
      owedByMe,
      owedToMe,
      overdueCount: overdueDebts.length,
      overdueAmount: overdueDebts.reduce(
        (sum, debt) => sum + Number(debt.remaining_amount || 0),
        0
      ),
    };
  }, [debts]);

  const recentDebts = useMemo(() => {
    return debts
      .filter(
        (debt) =>
          debt.calculated_status === "active" ||
          debt.calculated_status === "partially_paid"
      )
      .sort((a, b) => {
        const aDate = a.due_date || "9999-12-31";
        const bDate = b.due_date || "9999-12-31";

        return aDate.localeCompare(bDate);
      })
      .slice(0, 4);
  }, [debts]);

  /* =========================
     Monthly Budget
  ========================= */

  const monthlyBudgetTotal = useMemo(() => {
    return monthlyBudgets.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );
  }, [monthlyBudgets]);

  const monthlyBudgetRemaining =
    monthlyBudgetTotal - monthlyExpenses;

  const monthlyBudgetPercentage =
    monthlyBudgetTotal > 0
      ? (monthlyExpenses / monthlyBudgetTotal) * 100
      : 0;

  const monthlyBudgetProgress = Math.min(
    100,
    Math.max(0, monthlyBudgetPercentage)
  );

  const budgetExceeded =
    monthlyBudgetTotal > 0 &&
    monthlyExpenses > monthlyBudgetTotal;

  const budgetWarning =
    monthlyBudgetTotal > 0 &&
    monthlyBudgetPercentage >= 80 &&
    monthlyBudgetPercentage <= 100;

  const hasMonthlyBudget = monthlyBudgetTotal > 0;

  /* =========================
     Budget category details
  ========================= */

  const budgetCategoryDetails = useMemo(() => {
    return monthlyBudgets
      .map((budget) => {
        const category = expenseCategoryMap.get(budget.category_id);

        const spent = expenses
          .filter(
            (expense) =>
              expense.category_id === budget.category_id &&
              expense.expense_date >= monthStart &&
              expense.expense_date < nextMonthStart
          )
          .reduce(
            (sum, expense) => sum + Number(expense.amount || 0),
            0
          );

        const amount = Number(budget.amount || 0);

        const percentage =
          amount > 0 ? (spent / amount) * 100 : 0;

        return {
          id: budget.id,
          categoryId: budget.category_id,
          categoryName: category?.name || "تصنيف غير موجود",
          amount,
          spent,
          remaining: amount - spent,
          percentage,
        };
      })
      .sort((a, b) => b.percentage - a.percentage);
  }, [
    monthlyBudgets,
    expenseCategoryMap,
    expenses,
    monthStart,
    nextMonthStart,
  ]);

  /* =========================
     Last 7 days
  ========================= */

  const last7Days = useMemo(() => {
    const result: {
      date: string;
      label: string;
      income: number;
      expense: number;
    }[] = [];

    const todayDate = new Date();

    for (let index = 6; index >= 0; index -= 1) {
      const date = new Date(todayDate);
      date.setDate(todayDate.getDate() - index);

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");

      const dateKey = `${year}-${month}-${day}`;

      const income = incomes
        .filter((item) => item.income_date === dateKey)
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      const expense = expenses
        .filter((item) => item.expense_date === dateKey)
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      const label = new Intl.DateTimeFormat("ar-DZ", {
        weekday: "short",
      }).format(date);

      result.push({
        date: dateKey,
        label,
        income,
        expense,
      });
    }

    return result;
  }, [incomes, expenses]);

  const maxChartValue = useMemo(() => {
    return Math.max(
      1,
      ...last7Days.flatMap((item) => [item.income, item.expense])
    );
  }, [last7Days]);

  /* =========================
     Expense categories
  ========================= */

  const expenseByCategory = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        amount: number;
      }
    >();

    expenses
      .filter(
        (item) =>
          item.expense_date >= monthStart && item.expense_date <= today
      )
      .forEach((item) => {
        const category = item.category_id
          ? expenseCategoryMap.get(item.category_id)
          : null;

        const name = category?.name || "غير مصنف";
        const key = item.category_id || "uncategorized";

        const current = map.get(key);

        if (current) {
          current.amount += Number(item.amount || 0);
        } else {
          map.set(key, {
            name,
            amount: Number(item.amount || 0),
          });
        }
      });

    return Array.from(map.values()).sort(
      (a, b) => b.amount - a.amount
    );
  }, [expenses, expenseCategoryMap, monthStart, today]);

  const maxCategoryExpense = Math.max(
    1,
    ...expenseByCategory.map((item) => item.amount)
  );

  /* =========================
     Recent transactions
  ========================= */

  const recentTransactions = useMemo<Transaction[]>(() => {
    const incomeTransactions: Transaction[] = incomes.map((item) => ({
      id: `income-${item.id}`,
      type: "income",
      amount: Number(item.amount || 0),
      date: item.income_date,
      description: item.description || "إيراد",
      note: item.note,
      categoryName: item.category_id
        ? incomeCategoryMap.get(item.category_id) || "غير مصنف"
        : "غير مصنف",
    }));

    const expenseTransactions: Transaction[] = expenses.map((item) => {
      const category = item.category_id
        ? expenseCategoryMap.get(item.category_id)
        : null;

      return {
        id: `expense-${item.id}`,
        type: "expense",
        amount: Number(item.amount || 0),
        date: item.expense_date,
        description: item.description || "مصروف",
        note: item.note,
        categoryName: category?.name || "غير مصنف",
      };
    });

    return [...incomeTransactions, ...expenseTransactions]
      .sort((a, b) => {
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }

        return b.id.localeCompare(a.id);
      })
      .slice(0, 8);
  }, [
    incomes,
    expenses,
    incomeCategoryMap,
    expenseCategoryMap,
  ]);

  /* =========================
     Financial health
  ========================= */

  const expenseRatio =
    monthlyIncome > 0
      ? Math.min(100, (monthlyExpenses / monthlyIncome) * 100)
      : monthlyExpenses > 0
        ? 100
        : 0;

  const savingsRatio =
    monthlyIncome > 0
      ? Math.max(0, (monthlyNet / monthlyIncome) * 100)
      : 0;

  /* =========================
     Loading
  ========================= */

  if (loading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-slate-50 px-4 py-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 h-10 w-64 animate-pulse rounded-xl bg-slate-200" />

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-36 animate-pulse rounded-3xl bg-white shadow-sm"
              />
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="h-96 animate-pulse rounded-3xl bg-white lg:col-span-2" />
            <div className="h-96 animate-pulse rounded-3xl bg-white" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#f6f8fb] text-slate-900"
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

        {/* =========================
            Header
        ========================= */}

        <header className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
              <span>الرئيسية</span>
              <span>/</span>
              <span className="font-medium text-slate-800">
                لوحة التحكم
              </span>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              لوحة التحكم المالية
            </h1>

            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              نظرة شاملة على وضعك المالي وحركة الأموال.
            </p>

            {userEmail && (
              <p className="mt-1 text-xs text-slate-400">
                {userEmail}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadDashboard(true)}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshIcon
                className={`h-4 w-4 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
              تحديث
            </button>

            <Link
              href="/debts"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-700 shadow-sm transition hover:bg-amber-100"
            >
              <DebtIcon className="h-4 w-4" />
              الديون
            </Link>

            <Link
              href="/budget"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-bold text-violet-700 shadow-sm transition hover:bg-violet-100"
            >
              <CalendarIcon className="h-4 w-4" />
              الميزانية
            </Link>

            <Link
              href="/incomes"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <PlusIcon className="h-4 w-4" />
              تسجيل إيراد
            </Link>

            <Link
              href="/expenses"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
            >
              <PlusIcon className="h-4 w-4" />
              تسجيل مصروف
            </Link>
          </div>
        </header>

        {/* =========================
            Error
        ========================= */}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-bold">
                تعذر تحميل البيانات
              </p>

              <p className="mt-1 text-sm">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* =========================
            Main balance
        ========================= */}

        <section className="mb-6 overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm text-slate-300">
                <WalletIcon className="h-5 w-5" />
                <span>الرصيد الإجمالي الحالي</span>
              </div>

              <div
                className={`text-4xl font-black tracking-tight sm:text-5xl ${
                  balance < 0
                    ? "text-red-400"
                    : "text-white"
                }`}
              >
                {formatMoney(balance)}
              </div>

              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
                الرصيد محسوب تلقائياً من إجمالي المداخيل مطروحاً
                منه إجمالي المصاريف المسجلة في النظام.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:min-w-[360px]">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
                  <IncomeIcon className="h-4 w-4" />
                  إجمالي المداخيل
                </div>

                <p className="text-xl font-black text-emerald-400">
                  {formatMoney(totalIncome)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
                  <ExpenseIcon className="h-4 w-4" />
                  إجمالي المصاريف
                </div>

                <p className="text-xl font-black text-red-400">
                  {formatMoney(totalExpenses)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================
            Monthly cards
        ========================= */}

        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500">
                  مداخيل الشهر
                </p>

                <p className="mt-2 text-2xl font-black text-slate-950">
                  {formatMoney(monthlyIncome)}
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                <IncomeIcon className="h-6 w-6" />
              </div>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-full rounded-full bg-emerald-500" />
            </div>

            <p className="mt-2 text-xs text-slate-400">
              منذ بداية الشهر
            </p>
          </div>

          <div className="rounded-3xl border border-red-100 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500">
                  مصاريف الشهر
                </p>

                <p className="mt-2 text-2xl font-black text-slate-950">
                  {formatMoney(monthlyExpenses)}
                </p>
              </div>

              <div className="rounded-2xl bg-red-50 p-3 text-red-600">
                <ExpenseIcon className="h-6 w-6" />
              </div>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-red-500"
                style={{
                  width: `${expenseRatio}%`,
                }}
              />
            </div>

            <p className="mt-2 text-xs text-slate-400">
              {expenseRatio.toFixed(0)}% من دخل الشهر
            </p>
          </div>

          <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500">
                  صافي الشهر
                </p>

                <p
                  className={`mt-2 text-2xl font-black ${
                    monthlyNet >= 0
                      ? "text-blue-600"
                      : "text-red-600"
                  }`}
                >
                  {formatMoney(monthlyNet)}
                </p>
              </div>

              <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                <TrendingIcon className="h-6 w-6" />
              </div>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${
                  monthlyNet >= 0
                    ? "bg-blue-500"
                    : "bg-red-500"
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(0, savingsRatio)
                  )}%`,
                }}
              />
            </div>

            <p className="mt-2 text-xs text-slate-400">
              {savingsRatio.toFixed(0)}% متبقٍ من الدخل
            </p>
          </div>

          <div className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500">
                  العمليات المسجلة
                </p>

                <p className="mt-2 text-2xl font-black text-slate-950">
                  {new Intl.NumberFormat("ar-DZ").format(
                    incomes.length + expenses.length
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-violet-50 p-3 text-violet-600">
                <ReceiptIcon className="h-6 w-6" />
              </div>
            </div>

            <p className="text-xs leading-5 text-slate-400">
              إجمالي عدد المداخيل والمصاريف المسجلة.
            </p>
          </div>
        </section>

        {/* =========================
            Debts
        ========================= */}

        <section className="mb-6 overflow-hidden rounded-[2rem] border border-amber-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 bg-gradient-to-l from-amber-50 to-white p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700">
                    <DebtIcon className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      متابعة الديون
                    </h2>

                    <p className="mt-0.5 text-sm text-slate-500">
                      الديون الحالية والمتبقي منها
                    </p>
                  </div>
                </div>
              </div>

              <Link
                href="/debts"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-amber-700"
              >
                إدارة الديون
                <ArrowLeftIcon className="h-4 w-4" />
              </Link>

            </div>
          </div>

          <div className="p-5 sm:p-6">

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

              {/* ما عليّ */}

              <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-500">
                      إجمالي ما عليّ
                    </p>

                    <p className="mt-2 text-2xl font-black text-red-600">
                      {formatMoney(debtStats.owedByMe)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-3 text-red-600 shadow-sm">
                    <DebtIcon className="h-5 w-5" />
                  </div>
                </div>

                <p className="mt-2 text-xs text-slate-400">
                  المبلغ المتبقي الواجب سداده.
                </p>
              </div>

              {/* ما لي */}

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-500">
                      إجمالي ما لي
                    </p>

                    <p className="mt-2 text-2xl font-black text-emerald-600">
                      {formatMoney(debtStats.owedToMe)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-3 text-emerald-600 shadow-sm">
                    <IncomeIcon className="h-5 w-5" />
                  </div>
                </div>

                <p className="mt-2 text-xs text-slate-400">
                  المبلغ المتبقي المستحق لك.
                </p>
              </div>

              {/* نشطة */}

              <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-500">
                      الديون النشطة
                    </p>

                    <p className="mt-2 text-2xl font-black text-amber-600">
                      {new Intl.NumberFormat("ar-DZ").format(
                        debtStats.activeCount
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-3 text-amber-600 shadow-sm">
                    <ReceiptIcon className="h-5 w-5" />
                  </div>
                </div>

                <p className="mt-2 text-xs text-slate-400">
                  ديون لم تُغلق بالكامل.
                </p>
              </div>

              {/* متأخرة */}

              <div
                className={`rounded-2xl border p-4 ${
                  debtStats.overdueCount > 0
                    ? "border-red-200 bg-red-50"
                    : "border-slate-100 bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-500">
                      ديون متأخرة
                    </p>

                    <p
                      className={`mt-2 text-2xl font-black ${
                        debtStats.overdueCount > 0
                          ? "text-red-600"
                          : "text-slate-700"
                      }`}
                    >
                      {new Intl.NumberFormat("ar-DZ").format(
                        debtStats.overdueCount
                      )}
                    </p>
                  </div>

                  <div
                    className={`rounded-xl bg-white p-3 shadow-sm ${
                      debtStats.overdueCount > 0
                        ? "text-red-600"
                        : "text-slate-500"
                    }`}
                  >
                    <AlertIcon className="h-5 w-5" />
                  </div>
                </div>

                <p className="mt-2 text-xs text-slate-400">
                  {debtStats.overdueCount > 0
                    ? `المتبقي المتأخر: ${formatMoney(
                        debtStats.overdueAmount
                      )}`
                    : "لا توجد ديون متأخرة حاليًا."}
                </p>
              </div>

            </div>

            {/* Recent active debts */}

            {recentDebts.length > 0 ? (
              <div className="mt-7">

                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-slate-900">
                      الديون الحالية
                    </h3>

                    <p className="mt-1 text-xs text-slate-400">
                      أقرب الديون المستحقة والمتبقية.
                    </p>
                  </div>

                  <Link
                    href="/debts"
                    className="text-xs font-black text-amber-600 hover:text-amber-800"
                  >
                    عرض التفاصيل
                  </Link>
                </div>

                <div className="grid gap-3 md:grid-cols-2">

                  {recentDebts.map((debt) => {
                    const isOwedByMe =
                      debt.debt_type === "owed_by_me";

                    const isOverdue =
                      debt.due_date &&
                      debt.due_date < today &&
                      Number(debt.remaining_amount || 0) > 0;

                    return (
                      <div
                        key={debt.id}
                        className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
                      >
                        <div className="flex items-start justify-between gap-4">

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded-lg px-2 py-1 text-[11px] font-black ${
                                  isOwedByMe
                                    ? "bg-red-100 text-red-700"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}
                              >
                                {isOwedByMe
                                  ? "عليّ"
                                  : "لي"}
                              </span>

                              <span
                                className={`rounded-lg px-2 py-1 text-[11px] font-black ${
                                  debt.transaction_type === "work"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-slate-200 text-slate-600"
                                }`}
                              >
                                {debt.transaction_type === "work"
                                  ? "مهني"
                                  : "شخصي"}
                              </span>
                            </div>

                            <p className="mt-2 truncate text-sm font-black text-slate-800">
                              {debt.party_name}
                            </p>

                            {debt.description && (
                              <p className="mt-1 truncate text-xs text-slate-400">
                                {debt.description}
                              </p>
                            )}
                          </div>

                          <div className="shrink-0 text-left">
                            <p className="text-xs font-bold text-slate-400">
                              المتبقي
                            </p>

                            <p
                              className={`mt-1 text-lg font-black ${
                                isOwedByMe
                                  ? "text-red-600"
                                  : "text-emerald-600"
                              }`}
                            >
                              {formatMoney(
                                Number(debt.remaining_amount || 0)
                              )}
                            </p>
                          </div>

                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">

                          <div className="text-xs text-slate-400">
                            الأصل:{" "}
                            <strong className="text-slate-600">
                              {formatMoney(
                                Number(debt.original_amount || 0)
                              )}
                            </strong>
                          </div>

                          {debt.due_date ? (
                            <div
                              className={`text-xs font-bold ${
                                isOverdue
                                  ? "text-red-600"
                                  : "text-slate-500"
                              }`}
                            >
                              {isOverdue ? "متأخر: " : "الاستحقاق: "}
                              {formatDate(debt.due_date)}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">
                              دون تاريخ استحقاق
                            </span>
                          )}

                        </div>
                      </div>
                    );
                  })}

                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                <DebtIcon className="mx-auto h-9 w-9 text-slate-300" />

                <p className="mt-3 font-black text-slate-700">
                  لا توجد ديون نشطة
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  عند تسجيل دين جديد سيظهر هنا ملخصه مباشرة.
                </p>

                <Link
                  href="/debts"
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-amber-700"
                >
                  إدارة الديون
                  <ArrowLeftIcon className="h-4 w-4" />
                </Link>
              </div>
            )}

          </div>
        </section>

        {/* =========================
            Monthly Budget
        ========================= */}

        <section className="mb-6 overflow-hidden rounded-[2rem] border border-violet-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 bg-gradient-to-l from-violet-50 to-white p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-violet-100 p-2.5 text-violet-700">
                    <CalendarIcon className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      الميزانية الشهرية
                    </h2>

                    <p className="mt-0.5 text-sm text-slate-500">
                      {getCurrentMonthLabel()}
                    </p>
                  </div>
                </div>
              </div>

              <Link
                href="/budget"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-violet-700"
              >
                إدارة الميزانية
                <ArrowLeftIcon className="h-4 w-4" />
              </Link>

            </div>
          </div>

          {!hasMonthlyBudget ? (
            <div className="p-6 sm:p-8">
              <div className="flex flex-col items-center justify-between gap-5 rounded-2xl border border-dashed border-violet-200 bg-violet-50/50 p-6 text-center sm:flex-row sm:text-right">

                <div>
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm sm:mx-0">
                    <CalendarIcon className="h-6 w-6" />
                  </div>

                  <h3 className="font-black text-slate-900">
                    لم يتم إعداد ميزانية لهذا الشهر
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    حدد مبلغاً لكل تصنيف من مصاريفك ثم تابع الاستهلاك
                    مباشرة من لوحة التحكم.
                  </p>
                </div>

                <Link
                  href="/budget"
                  className="shrink-0 rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-violet-700"
                >
                  بناء ميزانية الشهر
                </Link>

              </div>
            </div>
          ) : (
            <div className="p-5 sm:p-6">

              <div className="grid gap-4 sm:grid-cols-3">

                <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
                  <p className="text-sm font-bold text-slate-500">
                    إجمالي الميزانية
                  </p>

                  <p className="mt-2 text-2xl font-black text-violet-700">
                    {formatMoney(monthlyBudgetTotal)}
                  </p>
                </div>

                <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4">
                  <p className="text-sm font-bold text-slate-500">
                    المصروف الفعلي
                  </p>

                  <p className="mt-2 text-2xl font-black text-red-600">
                    {formatMoney(monthlyExpenses)}
                  </p>
                </div>

                <div
                  className={`rounded-2xl border p-4 ${
                    monthlyBudgetRemaining >= 0
                      ? "border-emerald-100 bg-emerald-50/60"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <p className="text-sm font-bold text-slate-500">
                    المتبقي من الميزانية
                  </p>

                  <p
                    className={`mt-2 text-2xl font-black ${
                      monthlyBudgetRemaining >= 0
                        ? "text-emerald-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatMoney(monthlyBudgetRemaining)}
                  </p>
                </div>

              </div>

              <div className="mt-6">

                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {budgetExceeded ? (
                      <span className="inline-flex items-center gap-1.5 text-sm font-black text-red-600">
                        <AlertIcon className="h-4 w-4" />
                        تم تجاوز الميزانية
                      </span>
                    ) : budgetWarning ? (
                      <span className="inline-flex items-center gap-1.5 text-sm font-black text-amber-600">
                        <AlertIcon className="h-4 w-4" />
                        اقتربت من حد الميزانية
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-sm font-black text-emerald-600">
                        <CheckIcon className="h-4 w-4" />
                        الاستهلاك ضمن الميزانية
                      </span>
                    )}
                  </div>

                  <span className="text-sm font-black text-slate-700">
                    {monthlyBudgetPercentage.toFixed(1)}%
                  </span>
                </div>

                <div className="h-4 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${
                      budgetExceeded
                        ? "bg-red-500"
                        : budgetWarning
                          ? "bg-amber-500"
                          : "bg-violet-500"
                    }`}
                    style={{
                      width: `${monthlyBudgetProgress}%`,
                    }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    المصروف: {formatMoney(monthlyExpenses)}
                  </span>

                  <span>
                    الحد: {formatMoney(monthlyBudgetTotal)}
                  </span>
                </div>

              </div>

              {budgetCategoryDetails.length > 0 && (
                <div className="mt-7">

                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-slate-900">
                        استهلاك الميزانية حسب التصنيف
                      </h3>

                      <p className="mt-1 text-xs text-slate-400">
                        مقارنة المبلغ المحدد بالمصروف الفعلي.
                      </p>
                    </div>

                    <Link
                      href="/budget"
                      className="text-xs font-black text-violet-600 hover:text-violet-800"
                    >
                      عرض التفاصيل
                    </Link>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">

                    {budgetCategoryDetails
                      .slice(0, 6)
                      .map((item) => {
                        const progress = Math.min(
                          100,
                          Math.max(0, item.percentage)
                        );

                        const exceeded = item.percentage > 100;
                        const warning =
                          item.percentage >= 80 &&
                          item.percentage <= 100;

                        return (
                          <div
                            key={item.id}
                            className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
                          >
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <span className="truncate text-sm font-black text-slate-800">
                                {item.categoryName}
                              </span>

                              <span
                                className={`shrink-0 text-xs font-black ${
                                  exceeded
                                    ? "text-red-600"
                                    : warning
                                      ? "text-amber-600"
                                      : "text-slate-500"
                                }`}
                              >
                                {item.percentage.toFixed(0)}%
                              </span>
                            </div>

                            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                              <div
                                className={`h-full rounded-full ${
                                  exceeded
                                    ? "bg-red-500"
                                    : warning
                                      ? "bg-amber-500"
                                      : "bg-violet-500"
                                }`}
                                style={{
                                  width: `${progress}%`,
                                }}
                              />
                            </div>

                            <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                              <span className="text-slate-400">
                                مصروف:{" "}
                                <strong className="text-slate-600">
                                  {formatMoney(item.spent)}
                                </strong>
                              </span>

                              <span
                                className={
                                  item.remaining >= 0
                                    ? "font-bold text-emerald-600"
                                    : "font-bold text-red-600"
                                }
                              >
                                {item.remaining >= 0
                                  ? `متبقي ${formatMoney(
                                      item.remaining
                                    )}`
                                  : `تجاوز ${formatMoney(
                                      Math.abs(item.remaining)
                                    )}`}
                              </span>
                            </div>
                          </div>
                        );
                      })}

                  </div>
                </div>
              )}

            </div>
          )}
        </section>

        {/* =========================
            Analytics
        ========================= */}

        <section className="mb-6 grid gap-6 lg:grid-cols-3">

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2 sm:p-6">

            <div className="mb-7 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <ChartIcon className="h-5 w-5 text-slate-700" />

                  <h2 className="text-lg font-black text-slate-950">
                    حركة الأموال
                  </h2>
                </div>

                <p className="mt-1 text-sm text-slate-400">
                  المداخيل والمصاريف خلال آخر 7 أيام
                </p>
              </div>

              <div className="hidden items-center gap-4 text-xs sm:flex">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  المداخيل
                </div>

                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  المصاريف
                </div>
              </div>
            </div>

            <div className="flex h-64 items-end gap-2 sm:gap-4">

              {last7Days.map((item) => {
                const incomeHeight =
                  (item.income / maxChartValue) * 100;

                const expenseHeight =
                  (item.expense / maxChartValue) * 100;

                return (
                  <div
                    key={item.date}
                    className="flex h-full flex-1 flex-col justify-end"
                  >
                    <div className="flex h-full items-end justify-center gap-1 sm:gap-2">

                      <div
                        title={`مداخيل: ${formatMoney(item.income)}`}
                        className="w-1/2 max-w-7 rounded-t-xl bg-emerald-500 transition-all hover:bg-emerald-600"
                        style={{
                          height: `${Math.max(
                            item.income > 0 ? 4 : 1,
                            incomeHeight
                          )}%`,
                        }}
                      />

                      <div
                        title={`مصاريف: ${formatMoney(item.expense)}`}
                        className="w-1/2 max-w-7 rounded-t-xl bg-red-500 transition-all hover:bg-red-600"
                        style={{
                          height: `${Math.max(
                            item.expense > 0 ? 4 : 1,
                            expenseHeight
                          )}%`,
                        }}
                      />

                    </div>

                    <div className="mt-3 text-center text-[11px] font-bold text-slate-400">
                      {item.label}
                    </div>
                  </div>
                );
              })}

            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

            <div className="mb-6">
              <div className="flex items-center gap-2">
                <TrendingIcon className="h-5 w-5 text-slate-700" />

                <h2 className="text-lg font-black text-slate-950">
                  ملخص الشهر
                </h2>
              </div>

              <p className="mt-1 text-sm text-slate-400">
                الوضع المالي للشهر الحالي
              </p>
            </div>

            <div className="space-y-5">

              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-600">
                    المداخيل
                  </span>

                  <span className="font-black text-emerald-600">
                    {formatMoney(monthlyIncome)}
                  </span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-full rounded-full bg-emerald-500" />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-600">
                    المصاريف
                  </span>

                  <span className="font-black text-red-600">
                    {formatMoney(monthlyExpenses)}
                  </span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-red-500"
                    style={{
                      width: `${Math.min(
                        100,
                        monthlyIncome > 0
                          ? (monthlyExpenses / monthlyIncome) * 100
                          : monthlyExpenses > 0
                            ? 100
                            : 0
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-500">
                    المتبقي
                  </span>

                  <span
                    className={`text-lg font-black ${
                      monthlyNet >= 0
                        ? "text-blue-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatMoney(monthlyNet)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>نسبة الادخار الحالية</span>

                  <span className="font-bold">
                    {savingsRatio.toFixed(1)}%
                  </span>
                </div>
              </div>

              <Link
                href="/expenses"
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                تحليل المصاريف
                <ArrowLeftIcon className="h-4 w-4" />
              </Link>

            </div>
          </div>
        </section>

        {/* =========================
            Categories + Recent
        ========================= */}

        <section className="grid gap-6 lg:grid-cols-3">

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  توزيع المصاريف
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  حسب التصنيف خلال الشهر
                </p>
              </div>

              <Link
                href="/expenses"
                className="text-xs font-bold text-slate-500 hover:text-slate-900"
              >
                عرض الكل
              </Link>
            </div>

            {expenseByCategory.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-6 text-center">
                <p className="text-sm font-bold text-slate-600">
                  لا توجد مصاريف هذا الشهر
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  عند تسجيل مصاريف ستظهر هنا الإحصائيات.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {expenseByCategory
                  .slice(0, 6)
                  .map((item) => {
                    const percentage =
                      (item.amount / maxCategoryExpense) * 100;

                    return (
                      <div key={item.name}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="truncate text-sm font-bold text-slate-700">
                            {item.name}
                          </span>

                          <span className="shrink-0 text-sm font-black text-slate-900">
                            {formatMoney(item.amount)}
                          </span>
                        </div>

                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-slate-800"
                            style={{
                              width: `${percentage}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-2">

            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  آخر العمليات
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  أحدث الحركات المالية في حسابك
                </p>
              </div>

              <div className="flex gap-2">
                <Link
                  href="/incomes"
                  className="hidden rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 sm:block"
                >
                  المداخيل
                </Link>

                <Link
                  href="/expenses"
                  className="hidden rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 sm:block"
                >
                  المصاريف
                </Link>
              </div>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-8 text-center">

                <ReceiptIcon className="mx-auto h-10 w-10 text-slate-300" />

                <p className="mt-3 font-black text-slate-700">
                  لا توجد عمليات مالية بعد
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  ابدأ بتسجيل أول إيراد أو مصروف.
                </p>

                <div className="mt-5 flex justify-center gap-2">
                  <Link
                    href="/incomes"
                    className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white"
                  >
                    تسجيل إيراد
                  </Link>

                  <Link
                    href="/expenses"
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
                  >
                    تسجيل مصروف
                  </Link>
                </div>

              </div>
            ) : (
              <div className="divide-y divide-slate-100">

                {recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center gap-3 py-4 first:pt-0 last:pb-0"
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                        transaction.type === "income"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {transaction.type === "income" ? (
                        <IncomeIcon className="h-5 w-5" />
                      ) : (
                        <ExpenseIcon className="h-5 w-5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">

                        <p className="truncate text-sm font-black text-slate-800">
                          {transaction.description}
                        </p>

                        <p
                          className={`shrink-0 text-sm font-black ${
                            transaction.type === "income"
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          {transaction.type === "income"
                            ? "+"
                            : "-"}
                          {formatMoney(transaction.amount)}
                        </p>

                      </div>

                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                        <span>{transaction.categoryName}</span>

                        <span>•</span>

                        <span>
                          {formatDate(transaction.date)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

              </div>
            )}
          </div>
        </section>

        {/* =========================
            Quick actions
        ========================= */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

          <Link
            href="/incomes"
            className="group rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5 transition hover:-translate-y-0.5 hover:bg-emerald-50"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-2xl bg-white p-3 text-emerald-600 shadow-sm">
                <IncomeIcon className="h-6 w-6" />
              </div>

              <ArrowLeftIcon className="h-5 w-5 text-emerald-500 transition group-hover:-translate-x-1" />
            </div>

            <h3 className="font-black text-slate-900">
              إدارة المداخيل
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              تسجيل ومراجعة وتصنيف جميع مصادر الدخل.
            </p>
          </Link>

          <Link
            href="/expenses"
            className="group rounded-3xl border border-red-100 bg-red-50/60 p-5 transition hover:-translate-y-0.5 hover:bg-red-50"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-2xl bg-white p-3 text-red-600 shadow-sm">
                <ExpenseIcon className="h-6 w-6" />
              </div>

              <ArrowLeftIcon className="h-5 w-5 text-red-500 transition group-hover:-translate-x-1" />
            </div>

            <h3 className="font-black text-slate-900">
              إدارة المصاريف
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              متابعة المصاريف والتصنيفات والتحليلات.
            </p>
          </Link>

          <Link
            href="/debts"
            className="group rounded-3xl border border-amber-100 bg-amber-50/60 p-5 transition hover:-translate-y-0.5 hover:bg-amber-50"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-2xl bg-white p-3 text-amber-600 shadow-sm">
                <DebtIcon className="h-6 w-6" />
              </div>

              <ArrowLeftIcon className="h-5 w-5 text-amber-500 transition group-hover:-translate-x-1" />
            </div>

            <h3 className="font-black text-slate-900">
              إدارة الديون
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              متابعة ما عليك وما لك وتسجيل عمليات السداد.
            </p>
          </Link>

          <Link
            href="/budget"
            className="group rounded-3xl border border-violet-100 bg-violet-50/60 p-5 transition hover:-translate-y-0.5 hover:bg-violet-50"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-2xl bg-white p-3 text-violet-600 shadow-sm">
                <CalendarIcon className="h-6 w-6" />
              </div>

              <ArrowLeftIcon className="h-5 w-5 text-violet-500 transition group-hover:-translate-x-1" />
            </div>

            <h3 className="font-black text-slate-900">
              الميزانية الشهرية
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              تحديد الميزانية ومتابعة المصروف والمتبقي ونسبة الاستهلاك.
            </p>
          </Link>

          <Link
            href="/settings"
            className="group rounded-3xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:bg-slate-50"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 shadow-sm">
                <WalletIcon className="h-6 w-6" />
              </div>

              <ArrowLeftIcon className="h-5 w-5 text-slate-400 transition group-hover:-translate-x-1" />
            </div>

            <h3 className="font-black text-slate-900">
              الإعدادات
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              إعدادات الحساب والنظام والعملة.
            </p>
          </Link>

        </section>

        {/* =========================
            Footer info
        ========================= */}

        <footer className="mt-8 border-t border-slate-200 pt-5 text-center text-xs text-slate-400">
          نظام التسيير المالي الشخصي • البيانات تعتمد على العمليات
          المسجلة في حسابك
        </footer>
      </div>
    </main>
  );
}