"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Account = {
  id: string;
  name: string;
  opening_balance: number;
  currency: string;
};

type Operation = {
  id: string;
  type: "income" | "expense";
  amount: number;
  date: string;
  description: string | null;
  note: string | null;
};

export default function HomePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const [userEmail, setUserEmail] = useState("");
  const [account, setAccount] = useState<Account | null>(null);

  const [incomeTotal, setIncomeTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [operations, setOperations] = useState<Operation[]>([]);

  const [error, setError] = useState("");

  const currency = "دج";

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("ar-DZ", {
      maximumFractionDigits: 2,
    }).format(value);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUserEmail("");
        setAccount(null);
        setIncomeTotal(0);
        setExpenseTotal(0);
        setOperations([]);
        setLoading(false);
        return;
      }

      setUserEmail(user.email ?? "");

      const { data: accounts, error: accountError } = await supabase
        .from("accounts")
        .select("id, name, opening_balance, currency")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1);

      if (accountError) {
        throw new Error(accountError.message);
      }

      const currentAccount = accounts?.[0] ?? null;
      setAccount(currentAccount);

      if (!currentAccount) {
        setIncomeTotal(0);
        setExpenseTotal(0);
        setOperations([]);
        setLoading(false);
        return;
      }

      const [incomeResult, expenseResult] = await Promise.all([
        supabase
          .from("incomes")
          .select("id, amount, income_date, description, note")
          .eq("user_id", user.id)
          .eq("account_id", currentAccount.id)
          .order("income_date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(50),

        supabase
          .from("expenses")
          .select("id, amount, expense_date, description, note")
          .eq("user_id", user.id)
          .eq("account_id", currentAccount.id)
          .order("expense_date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (incomeResult.error) {
        throw new Error(incomeResult.error.message);
      }

      if (expenseResult.error) {
        throw new Error(expenseResult.error.message);
      }

      const incomeRows = incomeResult.data ?? [];
      const expenseRows = expenseResult.data ?? [];

      const totalIncome = incomeRows.reduce(
        (sum, item) => sum + Number(item.amount),
        0
      );

      const totalExpense = expenseRows.reduce(
        (sum, item) => sum + Number(item.amount),
        0
      );

      const combinedOperations: Operation[] = [
        ...incomeRows.map((item) => ({
          id: `income-${item.id}`,
          type: "income" as const,
          amount: Number(item.amount),
          date: item.income_date,
          description: item.description,
          note: item.note,
        })),

        ...expenseRows.map((item) => ({
          id: `expense-${item.id}`,
          type: "expense" as const,
          amount: Number(item.amount),
          date: item.expense_date,
          description: item.description,
          note: item.note,
        })),
      ]
        .sort((a, b) => {
          return (
            new Date(b.date).getTime() -
            new Date(a.date).getTime()
          );
        })
        .slice(0, 10);

      setIncomeTotal(totalIncome);
      setExpenseTotal(totalExpense);
      setOperations(combinedOperations);
    } catch (dashboardError) {
      setError(
        dashboardError instanceof Error
          ? dashboardError.message
          : "تعذر تحميل البيانات المالية."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.push("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadDashboard, router]);

  async function handleLogout() {
    setLoggingOut(true);
    setError("");

    const { error: logoutError } = await supabase.auth.signOut();

    if (logoutError) {
      setError(logoutError.message);
      setLoggingOut(false);
      return;
    }

    router.push("/login");
    router.refresh();
  }

  const openingBalance = Number(account?.opening_balance ?? 0);
  const balance = openingBalance + incomeTotal - expenseTotal;
  const net = incomeTotal - expenseTotal;

  if (!userEmail && !loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-8">
          <section className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-semibold text-blue-600">
              نظام التسيير المالي
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              التسيير المالي الشخصي
            </h1>

            <p className="mt-3 text-slate-500">
              سجّل الدخول لعرض وإدارة بياناتك المالية.
            </p>

            <Link
              href="/login"
              className="mt-6 inline-flex rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              تسجيل الدخول
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-600">
                نظام التسيير المالي
              </p>

              <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
                التسيير المالي الشخصي
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                إدارة المداخيل والمصاريف بسهولة.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {userEmail}
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {loggingOut ? "جارٍ الخروج..." : "تسجيل الخروج"}
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">الرصيد الحالي</p>

            <p className="mt-3 text-3xl font-bold text-slate-900">
              {loading ? "..." : formatMoney(balance)}
            </p>

            <p className="mt-2 text-sm text-slate-400">{currency}</p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">إجمالي المداخيل</p>

            <p className="mt-3 text-3xl font-bold text-green-600">
              {loading ? "..." : formatMoney(incomeTotal)}
            </p>

            <p className="mt-2 text-sm text-slate-400">{currency}</p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">إجمالي المصاريف</p>

            <p className="mt-3 text-3xl font-bold text-red-600">
              {loading ? "..." : formatMoney(expenseTotal)}
            </p>

            <p className="mt-2 text-sm text-slate-400">{currency}</p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">الصافي</p>

            <p
              className={`mt-3 text-3xl font-bold ${
                net >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {loading ? "..." : formatMoney(net)}
            </p>

            <p className="mt-2 text-sm text-slate-400">{currency}</p>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/incomes"
            className="rounded-3xl bg-green-600 p-6 text-white shadow-sm transition hover:bg-green-700"
          >
            <div className="text-3xl font-bold">+</div>

            <h2 className="mt-3 text-xl font-bold">
              إضافة مدخول
            </h2>

            <p className="mt-1 text-sm text-green-50">
              تسجيل مدخول جديد في حسابك.
            </p>
          </Link>

          <Link
            href="/expenses"
            className="rounded-3xl bg-red-600 p-6 text-white shadow-sm transition hover:bg-red-700"
          >
            <div className="text-3xl font-bold">−</div>

            <h2 className="mt-3 text-xl font-bold">
              إضافة مصروف
            </h2>

            <p className="mt-1 text-sm text-red-50">
              تسجيل مصروف جديد في حسابك.
            </p>
          </Link>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-3xl bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  آخر العمليات
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  أحدث المداخيل والمصاريف.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">
                جارٍ تحميل العمليات...
              </div>
            ) : operations.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">
                لا توجد عمليات مسجلة حتى الآن.
              </div>
            ) : (
              <div className="space-y-3">
                {operations.map((operation) => {
                  const isIncome = operation.type === "income";

                  return (
                    <div
                      key={operation.id}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${
                            isIncome
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {isIncome ? "+" : "−"}
                        </div>

                        <div>
                          <p className="font-semibold text-slate-900">
                            {operation.description ||
                              (isIncome ? "مدخول" : "مصروف")}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {operation.date}
                          </p>

                          {operation.note && (
                            <p className="mt-1 text-xs text-slate-400">
                              {operation.note}
                            </p>
                          )}
                        </div>
                      </div>

                      <p
                        className={`text-lg font-bold ${
                          isIncome
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {isIncome ? "+" : "-"}
                        {formatMoney(operation.amount)} دج
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              الحساب
            </h2>

            <div className="mt-5 rounded-2xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">
                الحساب النشط
              </p>

              <p className="mt-2 text-xl font-bold text-slate-900">
                {account?.name ?? "لا يوجد حساب"}
              </p>

              <div className="mt-5 border-t border-slate-200 pt-4">
                <p className="text-sm text-slate-500">
                  الرصيد الافتتاحي
                </p>

                <p className="mt-1 font-bold text-slate-900">
                  {formatMoney(openingBalance)} {currency}
                </p>
              </div>

              <div className="mt-4 border-t border-slate-200 pt-4">
                <p className="text-sm text-slate-500">
                  الرصيد الحالي
                </p>

                <p className="mt-1 text-xl font-bold text-blue-600">
                  {formatMoney(balance)} {currency}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Link
                href="/incomes"
                className="rounded-xl bg-green-50 px-3 py-3 text-center text-sm font-semibold text-green-700 hover:bg-green-100"
              >
                المداخيل
              </Link>

              <Link
                href="/expenses"
                className="rounded-xl bg-red-50 px-3 py-3 text-center text-sm font-semibold text-red-700 hover:bg-red-100"
              >
                المصاريف
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}