"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Income = {
  id: string;
  amount: number;
  income_date: string;
  description: string | null;
  note: string | null;
  category_id: string | null;
  category_name: string | null;
};

type IncomeCategory = {
  id: string;
  name: string;
};

export default function IncomesPage() {
  const [userId, setUserId] = useState("");
  const [accountId, setAccountId] = useState("");

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");

  const [categories, setCategories] = useState<IncomeCategory[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("ar-DZ", {
      maximumFractionDigits: 2,
    }).format(value);

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      setError("يرجى تسجيل الدخول أولًا.");
      return;
    }

    setUserId(user.id);

    await Promise.all([
      loadAccount(user.id),
      loadCategories(user.id),
      loadIncomes(user.id),
    ]);

    setLoading(false);
  }

  async function loadAccount(currentUserId: string) {
    const { data, error: accountError } = await supabase
      .from("accounts")
      .select("id")
      .eq("user_id", currentUserId)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (accountError) {
      setError(accountError.message);
      return;
    }

    if (data?.id) {
      setAccountId(data.id);
    }
  }

  async function loadCategories(currentUserId = userId) {
    if (!currentUserId) return;

    const { data, error: categoriesError } = await supabase
      .from("income_categories")
      .select("id, name")
      .eq("user_id", currentUserId)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (categoriesError) {
      setError(categoriesError.message);
      return;
    }

    setCategories(data ?? []);
  }

  async function loadIncomes(currentUserId = userId) {
    if (!currentUserId) return;

    const { data, error: incomesError } = await supabase
      .from("incomes")
      .select(
        `
        id,
        amount,
        income_date,
        description,
        note,
        category_id,
        income_categories (
          name
        )
      `
      )
      .eq("user_id", currentUserId)
      .order("income_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (incomesError) {
      setError(incomesError.message);
      return;
    }

    const formattedIncomes: Income[] = (data ?? []).map((income) => {
      const categoryData = Array.isArray(income.income_categories)
        ? income.income_categories[0]
        : income.income_categories;

      return {
        id: income.id,
        amount: Number(income.amount),
        income_date: income.income_date,
        description: income.description,
        note: income.note,
        category_id: income.category_id,
        category_name: categoryData?.name ?? null,
      };
    });

    setIncomes(formattedIncomes);
  }

  async function ensureAccount() {
    if (accountId) {
      return accountId;
    }

    if (!userId) {
      throw new Error("المستخدم غير مسجل الدخول.");
    }

    const { data: existing, error: existingError } = await supabase
      .from("accounts")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existing?.id) {
      setAccountId(existing.id);
      return existing.id;
    }

    const { data: created, error: createError } = await supabase
      .from("accounts")
      .insert({
        user_id: userId,
        name: "الصندوق الرئيسي",
        account_type: "cash",
        currency: "دج",
        opening_balance: 0,
      })
      .select("id")
      .single();

    if (createError || !created) {
      throw new Error(
        createError?.message ?? "تعذر إنشاء الحساب الرئيسي."
      );
    }

    setAccountId(created.id);

    return created.id;
  }

  function resetForm() {
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]);
    setCategoryId("");
    setDescription("");
    setNote("");
    setEditingId(null);
  }

  function startEdit(income: Income) {
    setEditingId(income.id);
    setAmount(String(income.amount));
    setDate(income.income_date);
    setCategoryId(income.category_id ?? "");
    setDescription(income.description ?? "");
    setNote(income.note ?? "");
    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const numericAmount = Number(amount);

      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw new Error("أدخل مبلغًا صحيحًا أكبر من صفر.");
      }

      if (!date) {
        throw new Error("اختر تاريخ المدخول.");
      }

      const currentAccountId = await ensureAccount();

      const payload = {
        user_id: userId,
        account_id: currentAccountId,
        category_id: categoryId || null,
        amount: numericAmount,
        income_date: date,
        description: description.trim() || null,
        note: note.trim() || null,
      };

      if (editingId) {
        const { error: updateError } = await supabase
          .from("incomes")
          .update({
            account_id: payload.account_id,
            category_id: payload.category_id,
            amount: payload.amount,
            income_date: payload.income_date,
            description: payload.description,
            note: payload.note,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId)
          .eq("user_id", userId);

        if (updateError) {
          throw new Error(updateError.message);
        }

        setMessage("تم تعديل المدخول بنجاح.");
      } else {
        const { error: insertError } = await supabase
          .from("incomes")
          .insert(payload);

        if (insertError) {
          throw new Error(insertError.message);
        }

        setMessage("تمت إضافة المدخول بنجاح.");
      }

      resetForm();
      await loadIncomes();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "حدث خطأ أثناء حفظ المدخول."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "هل أنت متأكد من حذف هذا المدخول؟ لا يمكن التراجع عن الحذف."
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    const { error: deleteError } = await supabase
      .from("incomes")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    if (editingId === id) {
      resetForm();
    }

    setMessage("تم حذف المدخول بنجاح.");

    await loadIncomes();
  }

  const total = incomes.reduce(
    (sum, income) => sum + Number(income.amount),
    0
  );

  return (
    <main className="min-h-screen">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-green-600">
              التسيير المالي
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              المداخيل
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              تسجيل وإدارة جميع المداخيل.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/settings"
              className="rounded-xl bg-blue-50 px-4 py-3 text-center text-sm font-semibold text-blue-700 hover:bg-blue-100"
            >
              التصنيفات
            </Link>

            <Link
              href="/"
              className="rounded-xl bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              الرئيسية
            </Link>
          </div>
        </div>

        <section className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {editingId ? "تعديل المدخول" : "إضافة مدخول"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                أدخل المعلومات الأساسية للمدخول.
              </p>
            </div>

            {editingId && (
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setMessage("");
                  setError("");
                }}
                className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                إلغاء التعديل
              </button>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid gap-5 md:grid-cols-2"
          >
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                المبلغ
              </label>

              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                التاريخ
              </label>

              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                التصنيف
              </label>

              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
              >
                <option value="">بدون تصنيف</option>

                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <Link
                href="/settings"
                className="mt-2 inline-block text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                إدارة التصنيفات
              </Link>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                الوصف
              </label>

              <input
                type="text"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                placeholder="راتب شهري..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                ملاحظة
              </label>

              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                placeholder="ملاحظات إضافية..."
              />
            </div>

            {message && (
              <div className="md:col-span-2 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                {message}
              </div>
            )}

            {error && (
              <div className="md:col-span-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={saving || loading}
                className="w-full rounded-xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "جارٍ الحفظ..."
                  : editingId
                    ? "حفظ التعديلات"
                    : "إضافة المدخول"}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                سجل المداخيل
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                عدد العمليات:{" "}
                <span className="font-semibold text-slate-700">
                  {incomes.length}
                </span>
              </p>
            </div>

            <div className="rounded-2xl bg-green-50 px-4 py-3 text-sm">
              <span className="text-slate-500">الإجمالي: </span>

              <span className="font-bold text-green-700">
                {formatMoney(total)} دج
              </span>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">جارٍ التحميل...</p>
          ) : incomes.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">
              لا توجد مداخيل مسجلة حتى الآن.
            </div>
          ) : (
            <div className="space-y-3">
              {incomes.map((income) => (
                <div
                  key={income.id}
                  className="rounded-2xl border border-slate-100 p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">
                          {income.description || "مدخول"}
                        </p>

                        {income.category_name && (
                          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                            {income.category_name}
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-sm text-slate-500">
                        {income.income_date}
                      </p>

                      {income.note && (
                        <p className="mt-1 text-sm text-slate-400">
                          {income.note}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <p className="text-lg font-bold text-green-600">
                        +{formatMoney(Number(income.amount))} دج
                      </p>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(income)}
                          className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          تعديل
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(income.id)}
                          className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}