"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../../lib/supabase";

type PlanType = "personal" | "work";

type FinancialPlan = {
  id: string;
  plan_month: string;
  plan_type: PlanType;
  savings_enabled: boolean;
  reserve_enabled: boolean;
  savings_percent: number | string;
  reserve_percent: number | string;
  savings_fixed: number | string;
  reserve_fixed: number | string;
  debt_payment_budget: number | string;
  note: string | null;
  emergency_note: string | null;
};

type IncomeRow = {
  id: string;
  amount: number | string;
  income_date: string;
  transaction_type: PlanType;
};

type ExpenseRow = {
  id: string;
  amount: number | string;
  expense_date: string;
  transaction_type: PlanType;
  category_id: string | null;
};

type Category = {
  id: string;
  name: string;
  parent_id: string | null;
  is_active: boolean;
};

type MonthlyBudgetRow = {
  id: string;
  category_id: string;
  budget_month: string;
  amount: number | string;
  note: string | null;
};

type SavingRow = {
  id: string;
  amount: number | string;
  savings_date: string;
  transaction_type: PlanType;
  description: string | null;
  note: string | null;
};

type ReserveRow = {
  id: string;
  amount: number | string;
  reserve_date: string;
  transaction_type: PlanType;
  description: string | null;
  note: string | null;
};

type DebtSummaryRow = {
  id: string;
  debt_type: "owed_by_me" | "owed_to_me";
  transaction_type: PlanType;
  party_name: string;
  original_amount: number | string;
  paid_amount: number | string;
  remaining_amount: number | string;
  due_date: string | null;
  calculated_status: "active" | "partially_paid" | "paid" | "cancelled";
};

type DebtPaymentRow = {
  id: string;
  debt_id: string;
  amount: number | string;
  payment_date: string;
  transaction_type: PlanType;
};

type SupabaseError = {
  message: string;
};

function getLocalDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Algiers",
  }).format(new Date());
}

function getMonthStart(value: string) {
  return `${value.slice(0, 7)}-01`;
}

function getNextMonthStart(monthStart: string) {
  const date = new Date(`${monthStart}T00:00:00`);
  date.setMonth(date.getMonth() + 1);

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-01`;
}

function formatMoney(value: number | string) {
  return `${Number(value || 0).toLocaleString("fr-DZ")} دج`;
}

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("ar-DZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Africa/Algiers",
  }).format(new Date(`${value}T00:00:00`));
}

function getMonthLabel(value: string) {
  return new Intl.DateTimeFormat("ar-DZ", {
    month: "long",
    year: "numeric",
    timeZone: "Africa/Algiers",
  }).format(new Date(`${value}T00:00:00`));
}

function percent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function WalletIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5.5A2.5 2.5 0 0 1 3 16.5v-9Z" />
      <path d="M3 8h16" />
      <path d="M16 13h5" />
      <circle cx="16" cy="13" r=".8" fill="currentColor" />
    </svg>
  );
}

function SavingsIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M5 8h12a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H7a4 4 0 0 1-4-4v-3a4 4 0 0 1 4-4Z" />
      <path d="M7 8V6a2 2 0 0 1 2-2h6" />
      <path d="M15 13h5" />
      <circle cx="15" cy="13" r=".8" fill="currentColor" />
    </svg>
  );
}

function ReserveIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 3v18" />
      <path d="M17 7c0-2-2-3-5-3S7 5 7 7s1.5 3 5 4 5 2 5 4-2 3-5 3-5-1-5-3" />
    </svg>
  );
}

function DebtIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="8" cy="8" r="3" />
      <circle cx="16" cy="16" r="3" />
      <path d="M10.5 9.5 13.5 12.5" />
      <path d="M5 16h4" />
      <path d="M15 8h4" />
    </svg>
  );
}

function ChartIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="m7 15 3-4 3 2 5-7" />
    </svg>
  );
}

function PlusIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ArrowLeftIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
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

export default function BudgetPage() {
  const today = getLocalDate();

  const [month, setMonth] = useState(getMonthStart(today));
  const [planType, setPlanType] = useState<PlanType>("work");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [plan, setPlan] = useState<FinancialPlan | null>(null);
  const [incomes, setIncomes] = useState<IncomeRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [monthlyBudgets, setMonthlyBudgets] = useState<MonthlyBudgetRow[]>(
    []
  );
  const [savings, setSavings] = useState<SavingRow[]>([]);
  const [reserves, setReserves] = useState<ReserveRow[]>([]);
  const [debts, setDebts] = useState<DebtSummaryRow[]>([]);
  const [debtPayments, setDebtPayments] = useState<DebtPaymentRow[]>([]);

  const [showSavingsModal, setShowSavingsModal] = useState(false);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);

  const [savingAmount, setSavingAmount] = useState("");
  const [savingDate, setSavingDate] = useState(today);
  const [savingDescription, setSavingDescription] = useState("");
  const [savingNote, setSavingNote] = useState("");

  const [reserveAmount, setReserveAmount] = useState("");
  const [reserveDate, setReserveDate] = useState(today);
  const [reserveDescription, setReserveDescription] = useState("");
  const [reserveNote, setReserveNote] = useState("");

  const [budgetCategoryId, setBudgetCategoryId] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetNote, setBudgetNote] = useState("");

  const [savingsEnabled, setSavingsEnabled] = useState(true);
  const [reserveEnabled, setReserveEnabled] = useState(true);
  const [savingsPercent, setSavingsPercent] = useState("10");
  const [reservePercent, setReservePercent] = useState("10");
  const [savingsFixed, setSavingsFixed] = useState("0");
  const [reserveFixed, setReserveFixed] = useState("0");
  const [debtPaymentBudget, setDebtPaymentBudget] = useState("0");
  const [planNote, setPlanNote] = useState("");
  const [emergencyNote, setEmergencyNote] = useState("");

  const monthEnd = useMemo(() => getNextMonthStart(month), [month]);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("يجب تسجيل الدخول أولاً.");
      }

      const [
        planResult,
        incomesResult,
        expensesResult,
        categoriesResult,
        budgetsResult,
        savingsResult,
        reserveResult,
        debtsResult,
        debtPaymentsResult,
      ] = await Promise.all([
        supabase
          .from("financial_plans")
          .select(
            `
              id,
              plan_month,
              plan_type,
              savings_enabled,
              reserve_enabled,
              savings_percent,
              reserve_percent,
              savings_fixed,
              reserve_fixed,
              debt_payment_budget,
              note,
              emergency_note
            `
          )
          .eq("user_id", user.id)
          .eq("plan_month", month)
          .eq("plan_type", planType)
          .maybeSingle(),

        supabase
          .from("incomes")
          .select("id, amount, income_date, transaction_type")
          .eq("user_id", user.id)
          .eq("transaction_type", planType)
          .gte("income_date", month)
          .lt("income_date", monthEnd)
          .order("income_date", { ascending: false }),

        supabase
          .from("expenses")
          .select(
            "id, amount, expense_date, transaction_type, category_id"
          )
          .eq("user_id", user.id)
          .eq("transaction_type", planType)
          .gte("expense_date", month)
          .lt("expense_date", monthEnd)
          .order("expense_date", { ascending: false }),

        supabase
          .from("expense_categories")
          .select("id, name, parent_id, is_active")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("name"),

        supabase
          .from("monthly_budgets")
          .select(
            "id, category_id, budget_month, amount, note"
          )
          .eq("user_id", user.id)
          .eq("budget_month", month),

        supabase
          .from("savings_transactions")
          .select(
            "id, amount, savings_date, transaction_type, description, note"
          )
          .eq("user_id", user.id)
          .eq("transaction_type", planType)
          .gte("savings_date", month)
          .lt("savings_date", monthEnd)
          .order("savings_date", { ascending: false }),

        supabase
          .from("reserve_transactions")
          .select(
            "id, amount, reserve_date, transaction_type, description, note"
          )
          .eq("user_id", user.id)
          .eq("transaction_type", planType)
          .gte("reserve_date", month)
          .lt("reserve_date", monthEnd)
          .order("reserve_date", { ascending: false }),

        supabase
          .from("debt_summary")
          .select(
            `
              id,
              debt_type,
              transaction_type,
              party_name,
              original_amount,
              paid_amount,
              remaining_amount,
              due_date,
              calculated_status
            `
          )
          .eq("user_id", user.id)
          .eq("transaction_type", planType)
          .order("created_at", { ascending: false }),

        supabase
          .from("debt_payments")
          .select(
            "id, debt_id, amount, payment_date, transaction_type"
          )
          .eq("user_id", user.id)
          .eq("transaction_type", planType)
          .gte("payment_date", month)
          .lt("payment_date", monthEnd)
          .order("payment_date", { ascending: false }),
      ]);

      const results = [
        planResult,
        incomesResult,
        expensesResult,
        categoriesResult,
        budgetsResult,
        savingsResult,
        reserveResult,
        debtsResult,
        debtPaymentsResult,
      ];

      const failed = results.find((result) => result.error);

      if (failed?.error) {
        throw new Error((failed.error as SupabaseError).message);
      }

      const loadedPlan = planResult.data as FinancialPlan | null;

      setPlan(loadedPlan);
      setIncomes((incomesResult.data ?? []) as IncomeRow[]);
      setExpenses((expensesResult.data ?? []) as ExpenseRow[]);
      setCategories((categoriesResult.data ?? []) as Category[]);
      setMonthlyBudgets(
        (budgetsResult.data ?? []) as MonthlyBudgetRow[]
      );
      setSavings((savingsResult.data ?? []) as SavingRow[]);
      setReserves((reserveResult.data ?? []) as ReserveRow[]);
      setDebts((debtsResult.data ?? []) as DebtSummaryRow[]);
      setDebtPayments(
        (debtPaymentsResult.data ?? []) as DebtPaymentRow[]
      );

      if (loadedPlan) {
        setSavingsEnabled(loadedPlan.savings_enabled);
        setReserveEnabled(loadedPlan.reserve_enabled);
        setSavingsPercent(String(loadedPlan.savings_percent));
        setReservePercent(String(loadedPlan.reserve_percent));
        setSavingsFixed(String(loadedPlan.savings_fixed));
        setReserveFixed(String(loadedPlan.reserve_fixed));
        setDebtPaymentBudget(
          String(loadedPlan.debt_payment_budget)
        );
        setPlanNote(loadedPlan.note ?? "");
        setEmergencyNote(loadedPlan.emergency_note ?? "");
      } else {
        setSavingsEnabled(true);
        setReserveEnabled(true);
        setSavingsPercent("10");
        setReservePercent("10");
        setSavingsFixed("0");
        setReserveFixed("0");
        setDebtPaymentBudget("0");
        setPlanNote("");
        setEmergencyNote("");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر تحميل بيانات الميزانية."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [month, planType]);

  const totalIncome = useMemo(
    () =>
      incomes.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      ),
    [incomes]
  );

  const totalExpenses = useMemo(
    () =>
      expenses.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      ),
    [expenses]
  );

  const plannedSavings = useMemo(() => {
    if (!savingsEnabled) return 0;

    const byPercent =
      totalIncome * (Number(savingsPercent || 0) / 100);

    return Math.max(Number(savingsFixed || 0), byPercent);
  }, [
    savingsEnabled,
    totalIncome,
    savingsPercent,
    savingsFixed,
  ]);

  const plannedReserve = useMemo(() => {
    if (!reserveEnabled) return 0;

    const byPercent =
      totalIncome * (Number(reservePercent || 0) / 100);

    return Math.max(Number(reserveFixed || 0), byPercent);
  }, [
    reserveEnabled,
    totalIncome,
    reservePercent,
    reserveFixed,
  ]);

  const plannedDebtPayment = Number(
    debtPaymentBudget || 0
  );

  const operatingBudget = Math.max(
    0,
    totalIncome -
      plannedSavings -
      plannedReserve -
      plannedDebtPayment
  );

  const actualSavings = useMemo(
    () =>
      savings.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      ),
    [savings]
  );

  const actualReserve = useMemo(
    () =>
      reserves.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      ),
    [reserves]
  );

  const actualDebtPayment = useMemo(
    () =>
      debtPayments.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      ),
    [debtPayments]
  );

  const operatingSpent = Math.max(
    0,
    totalExpenses
  );

  const operatingRemaining =
    operatingBudget - operatingSpent;

  const savingsProgress =
    plannedSavings > 0
      ? percent((actualSavings / plannedSavings) * 100)
      : 0;

  const reserveProgress =
    plannedReserve > 0
      ? percent((actualReserve / plannedReserve) * 100)
      : 0;

  const debtProgress =
    plannedDebtPayment > 0
      ? percent(
          (actualDebtPayment / plannedDebtPayment) * 100
        )
      : 0;

  const budgetProgress =
    operatingBudget > 0
      ? percent(
          (operatingSpent / operatingBudget) * 100
        )
      : 0;

  const outstandingDebts = useMemo(
    () =>
      debts.filter(
        (debt) =>
          Number(debt.remaining_amount || 0) > 0
      ),
    [debts]
  );

  const totalOwedByMe = useMemo(
    () =>
      outstandingDebts
        .filter(
          (debt) =>
            debt.debt_type === "owed_by_me"
        )
        .reduce(
          (sum, debt) =>
            sum +
            Number(debt.remaining_amount || 0),
          0
        ),
    [outstandingDebts]
  );

  const totalOwedToMe = useMemo(
    () =>
      outstandingDebts
        .filter(
          (debt) =>
            debt.debt_type === "owed_to_me"
        )
        .reduce(
          (sum, debt) =>
            sum +
            Number(debt.remaining_amount || 0),
          0
        ),
    [outstandingDebts]
  );

  const monthDebtPayments = debtPayments.length;

  const categoryRows = useMemo(() => {
    return categories
      .map((category) => {
        const budget = monthlyBudgets.find(
          (item) =>
            item.category_id === category.id
        );

        const childIds = categories
          .filter(
            (child) =>
              child.parent_id === category.id
          )
          .map((child) => child.id);

        const ids = [
          category.id,
          ...childIds,
        ];

        const spent = expenses
          .filter(
            (expense) =>
              expense.category_id &&
              ids.includes(expense.category_id)
          )
          .reduce(
            (sum, expense) =>
              sum + Number(expense.amount || 0),
            0
          );

        const budgetAmount = Number(
          budget?.amount || 0
        );

        const consumption =
          budgetAmount > 0
            ? (spent / budgetAmount) * 100
            : 0;

        return {
          category,
          budget,
          budgetAmount,
          spent,
          remaining:
            budgetAmount - spent,
          consumption,
        };
      })
      .filter(
        (row) =>
          row.budgetAmount > 0 ||
          row.spent > 0
      )
      .sort(
        (a, b) =>
          b.spent - a.spent
      );
  }, [
    categories,
    monthlyBudgets,
    expenses,
  ]);

  const parentCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          category.parent_id === null
      ),
    [categories]
  );

  async function savePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("يجب تسجيل الدخول أولاً.");
      }

      const payload = {
        user_id: user.id,
        plan_month: month,
        plan_type: planType,
        savings_enabled: savingsEnabled,
        reserve_enabled: reserveEnabled,
        savings_percent: Number(savingsPercent || 0),
        reserve_percent: Number(reservePercent || 0),
        savings_fixed: Number(savingsFixed || 0),
        reserve_fixed: Number(reserveFixed || 0),
        debt_payment_budget: Number(
          debtPaymentBudget || 0
        ),
        note: planNote.trim() || null,
        emergency_note:
          emergencyNote.trim() || null,
      };

      const { error: saveError } = await supabase
        .from("financial_plans")
        .upsert(payload, {
          onConflict:
            "user_id,plan_month,plan_type",
        });

      if (saveError) {
        throw new Error(saveError.message);
      }

      setShowPlanModal(false);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر حفظ الخطة المالية."
      );
    } finally {
      setSaving(false);
    }
  }

  async function addSaving(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amount = Number(savingAmount);

    if (!amount || amount <= 0) {
      setError("أدخل مبلغ ادخار صحيح.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("يجب تسجيل الدخول أولاً.");
      }

      const { error: insertError } = await supabase
        .from("savings_transactions")
        .insert({
          user_id: user.id,
          transaction_type: planType,
          amount,
          savings_date: savingDate,
          description:
            savingDescription.trim() || null,
          note: savingNote.trim() || null,
        });

      if (insertError) {
        throw new Error(insertError.message);
      }

      setSavingAmount("");
      setSavingDescription("");
      setSavingNote("");
      setShowSavingsModal(false);

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر تسجيل الادخار."
      );
    } finally {
      setSaving(false);
    }
  }

  async function addReserve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amount = Number(reserveAmount);

    if (!amount || amount <= 0) {
      setError("أدخل مبلغ احتياطي صحيح.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("يجب تسجيل الدخول أولاً.");
      }

      const { error: insertError } = await supabase
        .from("reserve_transactions")
        .insert({
          user_id: user.id,
          transaction_type: planType,
          amount,
          reserve_date: reserveDate,
          description:
            reserveDescription.trim() || null,
          note: reserveNote.trim() || null,
        });

      if (insertError) {
        throw new Error(insertError.message);
      }

      setReserveAmount("");
      setReserveDescription("");
      setReserveNote("");
      setShowReserveModal(false);

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر تسجيل الاحتياطي."
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveCategoryBudget(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const amount = Number(budgetAmount);

    if (!budgetCategoryId) {
      setError("اختر فئة المصروف.");
      return;
    }

    if (!amount || amount < 0) {
      setError("أدخل مبلغ ميزانية صحيح.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("يجب تسجيل الدخول أولاً.");
      }

      const existing = monthlyBudgets.find(
        (item) =>
          item.category_id === budgetCategoryId
      );

      if (existing) {
        const { error: updateError } =
          await supabase
            .from("monthly_budgets")
            .update({
              amount,
              note: budgetNote.trim() || null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id)
            .eq("user_id", user.id);

        if (updateError) {
          throw new Error(updateError.message);
        }
      } else {
        const { error: insertError } =
          await supabase
            .from("monthly_budgets")
            .insert({
              user_id: user.id,
              category_id: budgetCategoryId,
              budget_month: month,
              amount,
              note: budgetNote.trim() || null,
            });

        if (insertError) {
          throw new Error(insertError.message);
        }
      }

      setBudgetCategoryId("");
      setBudgetAmount("");
      setBudgetNote("");
      setShowBudgetModal(false);

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر حفظ ميزانية الفئة."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategoryBudget(id: string) {
    if (!window.confirm("هل تريد حذف ميزانية هذه الفئة؟")) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const { error: deleteError } = await supabase
        .from("monthly_budgets")
        .delete()
        .eq("id", id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر حذف الميزانية."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteSaving(id: string) {
    if (!window.confirm("هل تريد حذف عملية الادخار؟")) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const { error: deleteError } = await supabase
        .from("savings_transactions")
        .delete()
        .eq("id", id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر حذف عملية الادخار."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteReserve(id: string) {
    if (!window.confirm("هل تريد حذف عملية الاحتياطي؟")) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const { error: deleteError } = await supabase
        .from("reserve_transactions")
        .delete()
        .eq("id", id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر حذف عملية الاحتياطي."
      );
    } finally {
      setSaving(false);
    }
  }

  const planTypeLabel =
    planType === "work" ? "العمل" : "الشخصي";

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-50 text-slate-900"
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-6 rounded-3xl bg-slate-950 p-6 text-white shadow-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <div className="rounded-2xl bg-white/10 p-3">
                  <WalletIcon className="h-7 w-7" />
                </div>

                <div>
                  <h1 className="text-2xl font-black sm:text-3xl">
                    الميزانية والتخطيط المالي
                  </h1>

                  <p className="mt-1 text-sm text-slate-300">
                    إدارة الدخل والادخار والاحتياطي والديون
                    والمصاريف في خطة واحدة
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/"
                className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold transition hover:bg-white/15"
              >
                الرئيسية
              </Link>

              <Link
                href="/incomes"
                className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold transition hover:bg-white/15"
              >
                المداخيل
              </Link>

              <Link
                href="/expenses"
                className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold transition hover:bg-white/15"
              >
                المصاريف
              </Link>

              <Link
                href="/debts"
                className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold transition hover:bg-white/15"
              >
                الديون
              </Link>
            </div>
          </div>
        </header>

        {/* Controls */}
        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                الشهر
              </label>

              <input
                type="month"
                value={month.slice(0, 7)}
                onChange={(event) =>
                  setMonth(
                    `${event.target.value}-01`
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-slate-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                نوع الميزانية
              </label>

              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setPlanType("personal")}
                  className={`rounded-lg px-4 py-2.5 text-sm font-bold transition ${
                    planType === "personal"
                      ? "bg-white text-slate-950 shadow"
                      : "text-slate-500"
                  }`}
                >
                  شخصية
                </button>

                <button
                  type="button"
                  onClick={() => setPlanType("work")}
                  className={`rounded-lg px-4 py-2.5 text-sm font-bold transition ${
                    planType === "work"
                      ? "bg-white text-slate-950 shadow"
                      : "text-slate-500"
                  }`}
                >
                  عمل
                </button>
              </div>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setShowPlanModal(true)}
                className="w-full rounded-xl bg-slate-950 px-5 py-3 font-bold text-white transition hover:bg-slate-800"
              >
                إعداد خطة الشهر
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
            <p className="font-bold text-slate-600">
              جاري تحميل الميزانية...
            </p>
          </div>
        ) : (
          <>
            {/* Plan title */}
            <section className="mb-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-500">
                    الخطة الحالية
                  </p>

                  <h2 className="mt-1 text-2xl font-black text-slate-950">
                    {getMonthLabel(month)} —{" "}
                    {planTypeLabel}
                  </h2>
                </div>

                <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
                  {plan ? "خطة محفوظة" : "لم يتم إعداد الخطة بعد"}
                </div>
              </div>
            </section>

            {/* Main summary */}
            <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-500">
                    الدخل
                  </span>

                  <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                    <WalletIcon className="h-5 w-5" />
                  </div>
                </div>

                <p className="text-2xl font-black">
                  {formatMoney(totalIncome)}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  إجمالي دخل الشهر الفعلي
                </p>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-500">
                    الادخار
                  </span>

                  <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
                    <SavingsIcon className="h-5 w-5" />
                  </div>
                </div>

                <p className="text-2xl font-black text-emerald-700">
                  {formatMoney(actualSavings)}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  المخطط: {formatMoney(plannedSavings)}
                </p>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-500">
                    الاحتياطي
                  </span>

                  <div className="rounded-xl bg-amber-50 p-2 text-amber-700">
                    <ReserveIcon className="h-5 w-5" />
                  </div>
                </div>

                <p className="text-2xl font-black text-amber-700">
                  {formatMoney(actualReserve)}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  المخطط: {formatMoney(plannedReserve)}
                </p>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-500">
                    سداد الديون
                  </span>

                  <div className="rounded-xl bg-violet-50 p-2 text-violet-700">
                    <DebtIcon className="h-5 w-5" />
                  </div>
                </div>

                <p className="text-2xl font-black text-violet-700">
                  {formatMoney(actualDebtPayment)}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  المخطط: {formatMoney(plannedDebtPayment)}
                </p>
              </div>

              <div className="rounded-3xl bg-slate-950 p-5 text-white shadow-lg">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-300">
                    ميزانية التشغيل
                  </span>

                  <div className="rounded-xl bg-white/10 p-2">
                    <ChartIcon className="h-5 w-5" />
                  </div>
                </div>

                <p className="text-2xl font-black">
                  {formatMoney(operatingBudget)}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  بعد الادخار والاحتياطي والديون المخططة
                </p>
              </div>
            </section>

            {/* Financial flow */}
            <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6">
                <h2 className="text-xl font-black">
                  توزيع الدخل
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {formatMoney(totalIncome)} → الادخار →
                  الاحتياطي → سداد الديون → التشغيل
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-sm font-bold text-slate-500">
                    الدخل
                  </p>
                  <p className="mt-2 text-xl font-black">
                    {formatMoney(totalIncome)}
                  </p>
                </div>

                <div className="rounded-2xl bg-emerald-50 p-5">
                  <p className="text-sm font-bold text-emerald-700">
                    الادخار
                  </p>
                  <p className="mt-2 text-xl font-black text-emerald-800">
                    {formatMoney(plannedSavings)}
                  </p>
                  <p className="mt-1 text-xs text-emerald-700">
                    {savingsEnabled
                      ? `${savingsPercent}%`
                      : "متوقف"}
                  </p>
                </div>

                <div className="rounded-2xl bg-amber-50 p-5">
                  <p className="text-sm font-bold text-amber-700">
                    الاحتياطي
                  </p>
                  <p className="mt-2 text-xl font-black text-amber-800">
                    {formatMoney(plannedReserve)}
                  </p>
                  <p className="mt-1 text-xs text-amber-700">
                    {reserveEnabled
                      ? `${reservePercent}%`
                      : "متوقف"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-900 p-5 text-white">
                  <p className="text-sm font-bold text-slate-300">
                    المتاح للتشغيل
                  </p>
                  <p className="mt-2 text-xl font-black">
                    {formatMoney(operatingBudget)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    بعد التوزيعات المخططة
                  </p>
                </div>
              </div>
            </section>

            {/* Progress cards */}
            <section className="mb-6 grid gap-4 lg:grid-cols-3">
              <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-black">
                      تنفيذ الادخار
                    </h3>
                    <p className="text-xs text-slate-500">
                      الفعلي مقابل المخطط
                    </p>
                  </div>

                  <span className="font-black text-emerald-700">
                    {Math.round(savingsProgress)}%
                  </span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{
                      width: `${savingsProgress}%`,
                    }}
                  />
                </div>

                <div className="mt-3 flex justify-between text-xs font-bold text-slate-500">
                  <span>
                    فعلي: {formatMoney(actualSavings)}
                  </span>
                  <span>
                    مخطط: {formatMoney(plannedSavings)}
                  </span>
                </div>
              </div>

              <div className="rounded-3xl border border-amber-100 bg-white p-6 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-black">
                      تنفيذ الاحتياطي
                    </h3>
                    <p className="text-xs text-slate-500">
                      الفعلي مقابل المخطط
                    </p>
                  </div>

                  <span className="font-black text-amber-700">
                    {Math.round(reserveProgress)}%
                  </span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all"
                    style={{
                      width: `${reserveProgress}%`,
                    }}
                  />
                </div>

                <div className="mt-3 flex justify-between text-xs font-bold text-slate-500">
                  <span>
                    فعلي: {formatMoney(actualReserve)}
                  </span>
                  <span>
                    مخطط: {formatMoney(plannedReserve)}
                  </span>
                </div>
              </div>

              <div className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-black">
                      سداد الديون
                    </h3>
                    <p className="text-xs text-slate-500">
                      المدفوع خلال الشهر
                    </p>
                  </div>

                  <span className="font-black text-violet-700">
                    {plannedDebtPayment > 0
                      ? `${Math.round(debtProgress)}%`
                      : "—"}
                  </span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all"
                    style={{
                      width: `${debtProgress}%`,
                    }}
                  />
                </div>

                <div className="mt-3 flex justify-between text-xs font-bold text-slate-500">
                  <span>
                    فعلي: {formatMoney(actualDebtPayment)}
                  </span>
                  <span>
                    مخطط: {formatMoney(plannedDebtPayment)}
                  </span>
                </div>
              </div>
            </section>

            {/* Operating budget */}
            <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-black">
                    ميزانية التشغيل
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    المصاريف الفعلية مقارنة بالمبلغ المتاح
                    للتشغيل
                  </p>
                </div>

                <div
                  className={`rounded-full px-4 py-2 text-sm font-black ${
                    budgetProgress > 100
                      ? "bg-red-100 text-red-700"
                      : budgetProgress >= 80
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  استهلاك {Math.round(budgetProgress)}%
                </div>
              </div>

              <div className="mb-5 h-4 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all ${
                    budgetProgress > 100
                      ? "bg-red-500"
                      : budgetProgress >= 80
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{
                    width: `${budgetProgress}%`,
                  }}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold text-slate-500">
                    الميزانية
                  </p>
                  <p className="mt-1 text-lg font-black">
                    {formatMoney(operatingBudget)}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold text-slate-500">
                    المصروف
                  </p>
                  <p className="mt-1 text-lg font-black">
                    {formatMoney(operatingSpent)}
                  </p>
                </div>

                <div
                  className={`rounded-2xl p-4 ${
                    operatingRemaining < 0
                      ? "bg-red-50"
                      : "bg-emerald-50"
                  }`}
                >
                  <p
                    className={`text-xs font-bold ${
                      operatingRemaining < 0
                        ? "text-red-600"
                        : "text-emerald-600"
                    }`}
                  >
                    المتبقي
                  </p>

                  <p
                    className={`mt-1 text-lg font-black ${
                      operatingRemaining < 0
                        ? "text-red-700"
                        : "text-emerald-700"
                    }`}
                  >
                    {formatMoney(
                      Math.abs(operatingRemaining)
                    )}
                    {operatingRemaining < 0 && " تجاوز"}
                  </p>
                </div>
              </div>
            </section>

            {/* Debts */}
            <section className="mb-6 rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-black">
                    الديون والالتزامات
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    الديون مستقلة عن المصاريف العادية
                    وتظهر هنا للتخطيط والمتابعة
                  </p>
                </div>

                <Link
                  href="/debts"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700"
                >
                  إدارة الديون
                  <ArrowLeftIcon />
                </Link>
              </div>

              <div className="mb-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-red-50 p-5">
                  <p className="text-sm font-bold text-red-600">
                    ما عليّ
                  </p>
                  <p className="mt-2 text-xl font-black text-red-700">
                    {formatMoney(totalOwedByMe)}
                  </p>
                </div>

                <div className="rounded-2xl bg-emerald-50 p-5">
                  <p className="text-sm font-bold text-emerald-600">
                    ما لي
                  </p>
                  <p className="mt-2 text-xl font-black text-emerald-700">
                    {formatMoney(totalOwedToMe)}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-sm font-bold text-slate-500">
                    عمليات السداد هذا الشهر
                  </p>
                  <p className="mt-2 text-xl font-black">
                    {monthDebtPayments}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4 text-sm leading-7 text-violet-900">
                <strong>ملاحظة مالية:</strong>{" "}
                أصل الدين وسداده لا يتم احتسابهما كمصروف أو
                دخل عادي. تتم متابعة الدين بشكل مستقل عن
                الرصيد والمصاريف.
              </div>
            </section>

            {/* Category budgets */}
            <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-black">
                    ميزانية المصاريف حسب الفئات
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    حدد سقفاً لكل فئة وتابع الاستهلاك الفعلي
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowBudgetModal(true)
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  <PlusIcon className="h-4 w-4" />
                  إضافة ميزانية
                </button>
              </div>

              {categoryRows.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-8 text-center">
                  <p className="font-bold text-slate-600">
                    لا توجد ميزانيات للفئات حتى الآن.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setShowBudgetModal(true)
                    }
                    className="mt-4 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white"
                  >
                    إضافة أول ميزانية
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {categoryRows.map((row) => {
                    const consumption = Math.max(
                      0,
                      row.consumption
                    );

                    const width = Math.min(
                      100,
                      consumption
                    );

                    const danger =
                      consumption > 100;
                    const warning =
                      consumption >= 80 &&
                      consumption <= 100;

                    return (
                      <div
                        key={row.category.id}
                        className="rounded-2xl border border-slate-200 p-4"
                      >
                        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-black">
                                {row.category.name}
                              </h3>

                              {danger && (
                                <span className="rounded-full bg-red-100 px-2 py-1 text-[11px] font-black text-red-700">
                                  تجاوزت
                                </span>
                              )}

                              {warning && (
                                <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-black text-amber-700">
                                  تنبيه
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-xs text-slate-500">
                              المصروف:{" "}
                              {formatMoney(row.spent)}
                              {" — "}
                              الميزانية:{" "}
                              {formatMoney(
                                row.budgetAmount
                              )}
                            </p>
                          </div>

                          <div className="text-left">
                            <p
                              className={`text-lg font-black ${
                                danger
                                  ? "text-red-700"
                                  : warning
                                  ? "text-amber-700"
                                  : "text-emerald-700"
                              }`}
                            >
                              {Math.round(consumption)}%
                            </p>

                            <p className="text-xs text-slate-500">
                              {row.remaining >= 0
                                ? `متبقي ${formatMoney(
                                    row.remaining
                                  )}`
                                : `تجاوز ${formatMoney(
                                    Math.abs(
                                      row.remaining
                                    )
                                  )}`}
                            </p>
                          </div>
                        </div>

                        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${
                              danger
                                ? "bg-red-500"
                                : warning
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{
                              width: `${width}%`,
                            }}
                          />
                        </div>

                        {row.budget && (
                          <div className="mt-3 flex justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                deleteCategoryBudget(
                                  row.budget!.id
                                )
                              }
                              className="text-xs font-bold text-red-600 hover:text-red-700"
                            >
                              حذف الميزانية
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Actual savings / reserve */}
            <section className="mb-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black">
                      عمليات الادخار
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      الادخار الفعلي خلال الشهر
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setShowSavingsModal(true)
                    }
                    className="rounded-xl bg-emerald-600 p-2.5 text-white transition hover:bg-emerald-700"
                    title="تسجيل ادخار"
                  >
                    <PlusIcon className="h-5 w-5" />
                  </button>
                </div>

                {savings.length === 0 ? (
                  <div className="rounded-2xl bg-emerald-50 p-6 text-center">
                    <p className="font-bold text-emerald-800">
                      لم يتم تسجيل ادخار فعلي هذا الشهر.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {savings.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 p-4"
                      >
                        <div>
                          <p className="font-black">
                            {formatMoney(item.amount)}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {formatDate(
                              item.savings_date
                            )}
                            {item.description
                              ? ` — ${item.description}`
                              : ""}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            deleteSaving(item.id)
                          }
                          className="text-xs font-bold text-red-600"
                        >
                          حذف
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-amber-100 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black">
                      عمليات الاحتياطي
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      الاحتياطي الفعلي خلال الشهر
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setShowReserveModal(true)
                    }
                    className="rounded-xl bg-amber-500 p-2.5 text-white transition hover:bg-amber-600"
                    title="تسجيل احتياطي"
                  >
                    <PlusIcon className="h-5 w-5" />
                  </button>
                </div>

                {reserves.length === 0 ? (
                  <div className="rounded-2xl bg-amber-50 p-6 text-center">
                    <p className="font-bold text-amber-800">
                      لم يتم تسجيل احتياطي فعلي هذا الشهر.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reserves.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 p-4"
                      >
                        <div>
                          <p className="font-black">
                            {formatMoney(item.amount)}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {formatDate(
                              item.reserve_date
                            )}
                            {item.description
                              ? ` — ${item.description}`
                              : ""}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            deleteReserve(item.id)
                          }
                          className="text-xs font-bold text-red-600"
                        >
                          حذف
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Actions */}
            <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <button
                type="button"
                onClick={() =>
                  setShowSavingsModal(true)
                }
                className="rounded-2xl bg-emerald-600 p-5 text-right text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700"
              >
                <SavingsIcon className="mb-4 h-7 w-7" />
                <p className="font-black">
                  تسجيل ادخار
                </p>
                <p className="mt-1 text-xs text-emerald-100">
                  إضافة عملية ادخار فعلية
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  setShowReserveModal(true)
                }
                className="rounded-2xl bg-amber-500 p-5 text-right text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-600"
              >
                <ReserveIcon className="mb-4 h-7 w-7" />
                <p className="font-black">
                  تسجيل احتياطي
                </p>
                <p className="mt-1 text-xs text-amber-100">
                  إضافة مبلغ إلى الاحتياطي
                </p>
              </button>

              <Link
                href="/expenses"
                className="rounded-2xl bg-slate-950 p-5 text-right text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                <ChartIcon className="mb-4 h-7 w-7" />
                <p className="font-black">
                  تسجيل مصروف
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  تسجيل المصروفات الفعلية
                </p>
              </Link>

              <Link
                href="/debts"
                className="rounded-2xl bg-violet-600 p-5 text-right text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-violet-700"
              >
                <DebtIcon className="mb-4 h-7 w-7" />
                <p className="font-black">
                  إدارة الديون
                </p>
                <p className="mt-1 text-xs text-violet-100">
                  متابعة الديون والسداد
                </p>
              </Link>
            </section>
          </>
        )}
      </div>

      {/* Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-black">
                  إعداد الخطة المالية
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {getMonthLabel(month)} — {planTypeLabel}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowPlanModal(false)
                }
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold"
              >
                إغلاق
              </button>
            </div>

            <form
              onSubmit={savePlan}
              className="space-y-5"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="rounded-2xl border border-slate-200 p-4">
                  <span className="flex items-center justify-between">
                    <span className="font-black">
                      تفعيل الادخار
                    </span>

                    <input
                      type="checkbox"
                      checked={savingsEnabled}
                      onChange={(event) =>
                        setSavingsEnabled(
                          event.target.checked
                        )
                      }
                      className="h-5 w-5"
                    />
                  </span>
                </label>

                <label className="rounded-2xl border border-slate-200 p-4">
                  <span className="flex items-center justify-between">
                    <span className="font-black">
                      تفعيل الاحتياطي
                    </span>

                    <input
                      type="checkbox"
                      checked={reserveEnabled}
                      onChange={(event) =>
                        setReserveEnabled(
                          event.target.checked
                        )
                      }
                      className="h-5 w-5"
                    />
                  </span>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold">
                    نسبة الادخار %
                  </label>

                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={savingsPercent}
                    onChange={(event) =>
                      setSavingsPercent(
                        event.target.value
                      )
                    }
                    disabled={!savingsEnabled}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    نسبة الاحتياطي %
                  </label>

                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={reservePercent}
                    onChange={(event) =>
                      setReservePercent(
                        event.target.value
                      )
                    }
                    disabled={!reserveEnabled}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    حد أدنى ثابت للادخار
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={savingsFixed}
                    onChange={(event) =>
                      setSavingsFixed(
                        event.target.value
                      )
                    }
                    disabled={!savingsEnabled}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    حد أدنى ثابت للاحتياطي
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={reserveFixed}
                    onChange={(event) =>
                      setReserveFixed(
                        event.target.value
                      )
                    }
                    disabled={!reserveEnabled}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  ميزانية سداد الديون لهذا الشهر
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={debtPaymentBudget}
                  onChange={(event) =>
                    setDebtPaymentBudget(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500"
                />

                <p className="mt-2 text-xs text-slate-500">
                  هذا مبلغ مخطط للسداد فقط، ولا يحول الدين
                  إلى مصروف عادي.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  ملاحظة الخطة
                </label>

                <textarea
                  value={planNote}
                  onChange={(event) =>
                    setPlanNote(event.target.value)
                  }
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none"
                  placeholder="مثال: خطة العمل لشهر أكتوبر..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  ملاحظة ظرف طارئ
                </label>

                <textarea
                  value={emergencyNote}
                  onChange={(event) =>
                    setEmergencyNote(
                      event.target.value
                    )
                  }
                  rows={2}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none"
                  placeholder="مثال: يمكن تخفيض الادخار في حالة ظرف طارئ..."
                />
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-600">
                  تقدير الخطة الحالية
                </p>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div>
                    <span className="text-xs text-slate-500">
                      الادخار
                    </span>
                    <p className="font-black text-emerald-700">
                      {formatMoney(plannedSavings)}
                    </p>
                  </div>

                  <div>
                    <span className="text-xs text-slate-500">
                      الاحتياطي
                    </span>
                    <p className="font-black text-amber-700">
                      {formatMoney(plannedReserve)}
                    </p>
                  </div>

                  <div>
                    <span className="text-xs text-slate-500">
                      التشغيل
                    </span>
                    <p className="font-black">
                      {formatMoney(operatingBudget)}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-slate-950 px-5 py-3.5 font-black text-white disabled:opacity-50"
              >
                {saving
                  ? "جاري الحفظ..."
                  : "حفظ الخطة المالية"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Savings Modal */}
      {showSavingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-black">
                  تسجيل ادخار
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {planTypeLabel}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowSavingsModal(false)
                }
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold"
              >
                إغلاق
              </button>
            </div>

            <form
              onSubmit={addSaving}
              className="space-y-4"
            >
              <div>
                <label className="mb-2 block text-sm font-bold">
                  المبلغ
                </label>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={savingAmount}
                  onChange={(event) =>
                    setSavingAmount(
                      event.target.value
                    )
                  }
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-lg font-bold outline-none"
                  placeholder="مثال: 50000"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  التاريخ
                </label>

                <input
                  type="date"
                  value={savingDate}
                  onChange={(event) =>
                    setSavingDate(
                      event.target.value
                    )
                  }
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  الوصف
                </label>

                <input
                  type="text"
                  value={savingDescription}
                  onChange={(event) =>
                    setSavingDescription(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none"
                  placeholder="مثال: ادخار من راتب أكتوبر"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  ملاحظة
                </label>

                <textarea
                  value={savingNote}
                  onChange={(event) =>
                    setSavingNote(
                      event.target.value
                    )
                  }
                  rows={2}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-emerald-600 px-5 py-3.5 font-black text-white disabled:opacity-50"
              >
                {saving
                  ? "جاري التسجيل..."
                  : "حفظ الادخار"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Reserve Modal */}
      {showReserveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-black">
                  تسجيل احتياطي
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {planTypeLabel}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowReserveModal(false)
                }
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold"
              >
                إغلاق
              </button>
            </div>

            <form
              onSubmit={addReserve}
              className="space-y-4"
            >
              <div>
                <label className="mb-2 block text-sm font-bold">
                  المبلغ
                </label>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={reserveAmount}
                  onChange={(event) =>
                    setReserveAmount(
                      event.target.value
                    )
                  }
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-lg font-bold outline-none"
                  placeholder="مثال: 50000"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  التاريخ
                </label>

                <input
                  type="date"
                  value={reserveDate}
                  onChange={(event) =>
                    setReserveDate(
                      event.target.value
                    )
                  }
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  الوصف
                </label>

                <input
                  type="text"
                  value={reserveDescription}
                  onChange={(event) =>
                    setReserveDescription(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none"
                  placeholder="مثال: احتياطي صيانة الحافلة"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  ملاحظة
                </label>

                <textarea
                  value={reserveNote}
                  onChange={(event) =>
                    setReserveNote(
                      event.target.value
                    )
                  }
                  rows={2}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-amber-500 px-5 py-3.5 font-black text-white disabled:opacity-50"
              >
                {saving
                  ? "جاري التسجيل..."
                  : "حفظ الاحتياطي"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Category Budget Modal */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-black">
                  ميزانية فئة
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {getMonthLabel(month)} — {planTypeLabel}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowBudgetModal(false)
                }
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold"
              >
                إغلاق
              </button>
            </div>

            <form
              onSubmit={saveCategoryBudget}
              className="space-y-4"
            >
              <div>
                <label className="mb-2 block text-sm font-bold">
                  فئة المصروف
                </label>

                <select
                  value={budgetCategoryId}
                  onChange={(event) =>
                    setBudgetCategoryId(
                      event.target.value
                    )
                  }
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none"
                >
                  <option value="">
                    اختر الفئة
                  </option>

                  {parentCategories.map((category) => {
                    const children =
                      categories.filter(
                        (item) =>
                          item.parent_id ===
                          category.id
                      );

                    return (
                      <optgroup
                        key={category.id}
                        label={category.name}
                      >
                        <option value={category.id}>
                          {category.name}
                        </option>

                        {children.map((child) => (
                          <option
                            key={child.id}
                            value={child.id}
                          >
                            ↳ {child.name}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  مبلغ الميزانية
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={budgetAmount}
                  onChange={(event) =>
                    setBudgetAmount(
                      event.target.value
                    )
                  }
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-lg font-bold outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  ملاحظة
                </label>

                <textarea
                  value={budgetNote}
                  onChange={(event) =>
                    setBudgetNote(
                      event.target.value
                    )
                  }
                  rows={2}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none"
                  placeholder="مثال: الحد الأقصى للمواد الغذائية"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-slate-950 px-5 py-3.5 font-black text-white disabled:opacity-50"
              >
                {saving
                  ? "جاري الحفظ..."
                  : "حفظ ميزانية الفئة"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}