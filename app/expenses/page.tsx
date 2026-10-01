"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";

type Expense = {
  id: string;
  amount: number;
  expense_date: string;
  description: string | null;
  note: string | null;
  category_id: string | null;
  category_name: string | null;
  parent_category_id: string | null;
  parent_category_name: string | null;
};

type ExpenseCategory = {
  id: string;
  name: string;
  parent_id: string | null;
};

function getLocalDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("ar-DZ", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ar-DZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(`${date}T00:00:00`));
}

function StatIcon({
  type,
}: {
  type: "total" | "count" | "average";
}) {
  if (type === "total") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-6 w-6"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M12 3v18" />
        <path d="M16.5 7.5c0-1.8-1.8-3-4.5-3-2.7 0-4.5 1.2-4.5 3s1.8 3 4.5 3 4.5 1.2 4.5 3-1.8 3-4.5 3c-2.7 0-4.5-1.2-4.5-3" />
      </svg>
    );
  }

  if (type === "count") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-6 w-6"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="M8 9h8" />
        <path d="M8 13h5" />
        <path d="M8 17h3" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-6 w-6"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 18h16" />
      <path d="M6 15l4-4 3 2 5-6" />
      <path d="M15 7h3v3" />
    </svg>
  );
}

function ExpenseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M6 4h9l3 3v13H6z" />
      <path d="M14 4v4h4" />
      <path d="M9 11h6" />
      <path d="M9 15h4" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 7h16" />
      <path d="M7 12h10" />
      <path d="M10 17h4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="m7 7 10 10" />
      <path d="m17 7-10 10" />
    </svg>
  );
}

export default function ExpensesPage() {
  const [userId, setUserId] = useState("");
  const [accountId, setAccountId] = useState("");

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(getLocalDate());
  const [mainCategoryId, setMainCategoryId] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");

  const [search, setSearch] = useState("");
  const [filterMainCategoryId, setFilterMainCategoryId] =
    useState("");
  const [filterSubCategoryId, setFilterSubCategoryId] =
    useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const mainCategories = useMemo(
    () =>
      categories
        .filter((category) => category.parent_id === null)
        .sort((a, b) => a.name.localeCompare(b.name, "ar")),
    [categories]
  );

  const formSubCategories = useMemo(() => {
    if (!mainCategoryId) return [];

    return categories
      .filter(
        (category) => category.parent_id === mainCategoryId
      )
      .sort((a, b) => a.name.localeCompare(b.name, "ar"));
  }, [categories, mainCategoryId]);

  const filterSubCategories = useMemo(() => {
    if (!filterMainCategoryId) return [];

    return categories
      .filter(
        (category) =>
          category.parent_id === filterMainCategoryId
      )
      .sort((a, b) => a.name.localeCompare(b.name, "ar"));
  }, [categories, filterMainCategoryId]);

  const filteredExpenses = useMemo(() => {
    const text = search.trim().toLowerCase();

    return expenses.filter((expense) => {
      const matchesSearch =
        !text ||
        (expense.description ?? "")
          .toLowerCase()
          .includes(text) ||
        (expense.note ?? "")
          .toLowerCase()
          .includes(text) ||
        (expense.category_name ?? "")
          .toLowerCase()
          .includes(text) ||
        (expense.parent_category_name ?? "")
          .toLowerCase()
          .includes(text);

      const matchesMain =
        !filterMainCategoryId ||
        expense.parent_category_id === filterMainCategoryId ||
        expense.category_id === filterMainCategoryId;

      const matchesSub =
        !filterSubCategoryId ||
        expense.category_id === filterSubCategoryId;

      const matchesFrom =
        !filterDateFrom ||
        expense.expense_date >= filterDateFrom;

      const matchesTo =
        !filterDateTo ||
        expense.expense_date <= filterDateTo;

      return (
        matchesSearch &&
        matchesMain &&
        matchesSub &&
        matchesFrom &&
        matchesTo
      );
    });
  }, [
    expenses,
    search,
    filterMainCategoryId,
    filterSubCategoryId,
    filterDateFrom,
    filterDateTo,
  ]);

  const totalExpenses = useMemo(
    () =>
      expenses.reduce(
        (sum, expense) => sum + Number(expense.amount),
        0
      ),
    [expenses]
  );

  const filteredTotal = useMemo(
    () =>
      filteredExpenses.reduce(
        (sum, expense) => sum + Number(expense.amount),
        0
      ),
    [filteredExpenses]
  );

  const averageExpense =
    expenses.length > 0
      ? totalExpenses / expenses.length
      : 0;

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
      setError("يرجى تسجيل الدخول أولًا.");
      setLoading(false);
      return;
    }

    setUserId(user.id);

    await Promise.all([
      loadAccount(user.id),
      loadCategories(user.id),
      loadExpenses(user.id),
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

  async function loadCategories(currentUserId: string) {
    const { data, error: categoriesError } = await supabase
      .from("expense_categories")
      .select("id, name, parent_id")
      .eq("user_id", currentUserId)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (categoriesError) {
      setError(categoriesError.message);
      return;
    }

    setCategories(data ?? []);
  }

  async function loadExpenses(currentUserId: string) {
    const { data: expenseRows, error: expensesError } =
      await supabase
        .from("expenses")
        .select(
          "id, amount, expense_date, description, note, category_id"
        )
        .eq("user_id", currentUserId)
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false });

    if (expensesError) {
      setError(expensesError.message);
      return;
    }

    const { data: categoryRows, error: categoryError } =
      await supabase
        .from("expense_categories")
        .select("id, name, parent_id")
        .eq("user_id", currentUserId);

    if (categoryError) {
      setError(categoryError.message);
      return;
    }

    const categoryMap = new Map(
      (categoryRows ?? []).map((category) => [
        category.id,
        category,
      ])
    );

    const formattedExpenses: Expense[] = (
      expenseRows ?? []
    ).map((expense) => {
      const category = expense.category_id
        ? categoryMap.get(expense.category_id)
        : null;

      const parentCategory = category?.parent_id
        ? categoryMap.get(category.parent_id)
        : category?.parent_id === null
          ? category
          : null;

      return {
        id: expense.id,
        amount: Number(expense.amount),
        expense_date: expense.expense_date,
        description: expense.description,
        note: expense.note,
        category_id: expense.category_id,
        category_name: category?.name ?? null,
        parent_category_id: parentCategory?.id ?? null,
        parent_category_name:
          parentCategory?.name ?? null,
      };
    });

    setExpenses(formattedExpenses);
  }

  async function ensureAccount() {
    if (accountId) {
      return accountId;
    }

    if (!userId) {
      throw new Error("المستخدم غير مسجل الدخول.");
    }

    const { data: existing, error: existingError } =
      await supabase
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

    const { data: created, error: createError } =
      await supabase
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
        createError?.message ??
          "تعذر إنشاء الحساب الرئيسي."
      );
    }

    setAccountId(created.id);

    return created.id;
  }

  function resetForm() {
    setAmount("");
    setDate(getLocalDate());
    setMainCategoryId("");
    setSubCategoryId("");
    setDescription("");
    setNote("");
    setEditingId(null);
  }

  function openCreateModal() {
    resetForm();
    setError("");
    setMessage("");
    setShowModal(true);
  }

  function openEditModal(expense: Expense) {
    setEditingId(expense.id);
    setAmount(String(expense.amount));
    setDate(expense.expense_date);
    setDescription(expense.description ?? "");
    setNote(expense.note ?? "");

    const category = categories.find(
      (item) => item.id === expense.category_id
    );

    if (!category) {
      setMainCategoryId("");
      setSubCategoryId("");
    } else if (category.parent_id) {
      setMainCategoryId(category.parent_id);
      setSubCategoryId(category.id);
    } else {
      setMainCategoryId(category.id);
      setSubCategoryId("");
    }

    setError("");
    setMessage("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    resetForm();
    setError("");
  }

  function handleMainCategoryChange(value: string) {
    setMainCategoryId(value);
    setSubCategoryId("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      const numericAmount = Number(amount);

      if (
        !Number.isFinite(numericAmount) ||
        numericAmount <= 0
      ) {
        throw new Error(
          "أدخل مبلغًا صحيحًا أكبر من صفر."
        );
      }

      if (!date) {
        throw new Error("اختر تاريخ المصروف.");
      }

      if (!mainCategoryId) {
        throw new Error(
          "اختر التصنيف الرئيسي."
        );
      }

      const mainCategory = categories.find(
        (category) =>
          category.id === mainCategoryId &&
          category.parent_id === null
      );

      if (!mainCategory) {
        throw new Error(
          "التصنيف الرئيسي غير صالح."
        );
      }

      let finalCategoryId = mainCategoryId;

      if (subCategoryId) {
        const subCategory = categories.find(
          (category) =>
            category.id === subCategoryId
        );

        if (!subCategory) {
          throw new Error(
            "التصنيف الفرعي غير صالح."
          );
        }

        if (
          subCategory.parent_id !==
          mainCategoryId
        ) {
          throw new Error(
            "التصنيف الفرعي لا يتبع التصنيف الرئيسي المحدد."
          );
        }

        finalCategoryId = subCategoryId;
      }

      const currentAccountId =
        await ensureAccount();

      const payload = {
        user_id: userId,
        account_id: currentAccountId,
        category_id: finalCategoryId,
        amount: numericAmount,
        expense_date: date,
        description:
          description.trim() || null,
        note: note.trim() || null,
      };

      if (editingId) {
        const { error: updateError } =
          await supabase
            .from("expenses")
            .update({
              account_id: payload.account_id,
              category_id: payload.category_id,
              amount: payload.amount,
              expense_date:
                payload.expense_date,
              description:
                payload.description,
              note: payload.note,
              updated_at:
                new Date().toISOString(),
            })
            .eq("id", editingId)
            .eq("user_id", userId);

        if (updateError) {
          throw new Error(updateError.message);
        }

        setMessage(
          "تم تعديل المصروف بنجاح."
        );
      } else {
        const { error: insertError } =
          await supabase
            .from("expenses")
            .insert(payload);

        if (insertError) {
          throw new Error(insertError.message);
        }

        setMessage(
          "تم تسجيل المصروف بنجاح."
        );
      }

      setShowModal(false);
      resetForm();

      await loadExpenses(userId);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "حدث خطأ أثناء حفظ المصروف."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "هل أنت متأكد من حذف هذا المصروف؟ لا يمكن التراجع عن الحذف."
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    const { error: deleteError } =
      await supabase
        .from("expenses")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setMessage(
      "تم حذف المصروف بنجاح."
    );

    await loadExpenses(userId);
  }

  function resetFilters() {
    setSearch("");
    setFilterMainCategoryId("");
    setFilterSubCategoryId("");
    setFilterDateFrom("");
    setFilterDateTo("");
  }

  if (!userId && !loading) {
    return (
      <main className="min-h-screen bg-slate-100">
        <div className="mx-auto flex min-h-screen max-w-lg items-center justify-center px-4">
          <section className="w-full rounded-3xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">
              يجب تسجيل الدخول
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              سجّل الدخول للوصول إلى المصاريف.
            </p>

            <Link
              href="/login"
              className="mt-6 inline-flex rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white hover:bg-slate-800"
            >
              تسجيل الدخول
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f3f6fa] text-slate-900">
      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <header className="mb-5 rounded-3xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <ExpenseIcon />
              </div>

              <div>
                <p className="text-xs font-bold tracking-wide text-red-600">
                  التسيير المالي الشخصي
                </p>

                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  المصاريف
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  إدارة ومتابعة المصاريف بشكل واضح ومنظم.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700"
              >
                <PlusIcon />
                تسجيل مصروف
              </button>

              <Link
                href="/settings"
                className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                التصنيفات
              </Link>

              <Link
                href="/"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                الرئيسية
              </Link>
            </div>
          </div>
        </header>

        {/* =====================================================
            ALERTS
        ====================================================== */}

        {message && (
          <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 font-bold text-green-700">
                ✓
              </span>

              <span className="font-bold">
                {message}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setMessage("")}
              className="font-semibold text-green-700 hover:text-green-900"
            >
              إغلاق
            </button>
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* =====================================================
            STATISTICS
        ====================================================== */}

        <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  إجمالي المصاريف
                </p>

                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                  {loading
                    ? "..."
                    : formatMoney(totalExpenses)}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  دج
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <StatIcon type="total" />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  عدد العمليات
                </p>

                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                  {loading
                    ? "..."
                    : expenses.length}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  عملية مسجلة
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <StatIcon type="count" />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  متوسط المصروف
                </p>

                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                  {loading
                    ? "..."
                    : formatMoney(averageExpense)}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  دج لكل عملية
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <StatIcon type="average" />
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            FILTERS
        ====================================================== */}

        <section className="mb-5 rounded-3xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <FilterIcon />
              </div>

              <div>
                <h2 className="font-bold text-slate-900">
                  البحث والتصفية
                </h2>

                <p className="mt-0.5 text-xs text-slate-400">
                  اعرض العمليات التي تحتاجها فقط.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-5">
            <div className="relative lg:col-span-2">
              <label className="mb-2 block text-xs font-bold text-slate-600">
                بحث
              </label>

              <div className="relative">
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <SearchIcon />
                </span>

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="ابحث في الوصف أو التصنيف..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-11 pl-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold text-slate-600">
                التصنيف الرئيسي
              </label>

              <select
                value={filterMainCategoryId}
                onChange={(event) => {
                  setFilterMainCategoryId(
                    event.target.value
                  );
                  setFilterSubCategoryId("");
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              >
                <option value="">
                  كل التصنيفات
                </option>

                {mainCategories.map((category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold text-slate-600">
                التصنيف الفرعي
              </label>

              <select
                value={filterSubCategoryId}
                onChange={(event) =>
                  setFilterSubCategoryId(
                    event.target.value
                  )
                }
                disabled={
                  !filterMainCategoryId ||
                  filterSubCategories.length === 0
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">
                  {!filterMainCategoryId
                    ? "اختر الرئيسي أولًا"
                    : filterSubCategories.length
                      ? "كل الأصناف الفرعية"
                      : "لا توجد أصناف فرعية"}
                </option>

                {filterSubCategories.map((category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold text-slate-600">
                التاريخ
              </label>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(event) =>
                    setFilterDateFrom(
                      event.target.value
                    )
                  }
                  title="من تاريخ"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />

                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(event) =>
                    setFilterDateTo(
                      event.target.value
                    )
                  }
                  title="إلى تاريخ"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="text-sm text-slate-500">
              النتائج:
              {" "}
              <span className="font-bold text-slate-900">
                {filteredExpenses.length}
              </span>
              {" "}
              عملية
              {" "}
              •
              {" "}
              <span className="font-bold text-red-600">
                {formatMoney(filteredTotal)} دج
              </span>
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
            >
              إعادة ضبط الفلاتر
            </button>
          </div>
        </section>

        {/* =====================================================
            RECORDS
        ====================================================== */}

        <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                المصاريف المسجلة
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                جميع العمليات المالية المسجلة.
              </p>
            </div>

            <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700">
              إجمالي المعروض:
              {" "}
              {formatMoney(filteredTotal)} دج
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500">
              جارٍ تحميل البيانات...
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <ExpenseIcon />
              </div>

              <h3 className="mt-4 font-bold text-slate-800">
                لا توجد مصاريف
              </h3>

              <p className="mt-2 text-sm text-slate-400">
                جرّب تغيير الفلاتر أو سجّل أول مصروف.
              </p>

              <button
                type="button"
                onClick={openCreateModal}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700"
              >
                <PlusIcon />
                تسجيل مصروف
              </button>
            </div>
          ) : (
            <>
              {/* الهاتف */}

              <div className="divide-y divide-slate-100 md:hidden">
                {filteredExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900">
                          {expense.description ||
                            "مصروف"}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {formatDate(
                            expense.expense_date
                          )}
                        </p>
                      </div>

                      <p className="shrink-0 text-lg font-bold text-red-600">
                        -
                        {formatMoney(
                          Number(expense.amount)
                        )}{" "}
                        دج
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {expense.parent_category_name && (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          {
                            expense.parent_category_name
                          }
                        </span>
                      )}

                      {expense.category_name &&
                        expense.category_name !==
                          expense.parent_category_name && (
                          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                            {expense.category_name}
                          </span>
                        )}
                    </div>

                    {expense.note && (
                      <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
                        {expense.note}
                      </p>
                    )}

                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          openEditModal(expense)
                        }
                        className="flex-1 rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        تعديل
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(expense.id)
                        }
                        className="flex-1 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* الكمبيوتر */}

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 text-right text-xs text-slate-500">
                      <th className="px-5 py-4 font-bold">
                        التاريخ
                      </th>

                      <th className="px-5 py-4 font-bold">
                        التصنيف الرئيسي
                      </th>

                      <th className="px-5 py-4 font-bold">
                        التصنيف الفرعي
                      </th>

                      <th className="px-5 py-4 font-bold">
                        الوصف
                      </th>

                      <th className="px-5 py-4 font-bold">
                        المبلغ
                      </th>

                      <th className="px-5 py-4 font-bold">
                        الإجراءات
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredExpenses.map(
                      (expense) => (
                        <tr
                          key={expense.id}
                          className="transition hover:bg-slate-50/70"
                        >
                          <td className="px-5 py-4 text-sm text-slate-600">
                            {formatDate(
                              expense.expense_date
                            )}
                          </td>

                          <td className="px-5 py-4">
                            {expense.parent_category_name ? (
                              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                                {
                                  expense.parent_category_name
                                }
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>

                          <td className="px-5 py-4">
                            {expense.category_name &&
                            expense.category_name !==
                              expense.parent_category_name ? (
                              <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
                                {
                                  expense.category_name
                                }
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>

                          <td className="max-w-[260px] px-5 py-4">
                            <p className="truncate font-semibold text-slate-900">
                              {expense.description ||
                                "مصروف"}
                            </p>

                            {expense.note && (
                              <p className="mt-1 truncate text-xs text-slate-400">
                                {expense.note}
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4 text-base font-bold text-red-600">
                            -
                            {formatMoney(
                              Number(
                                expense.amount
                              )
                            )}{" "}
                            دج
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  openEditModal(
                                    expense
                                  )
                                }
                                className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                              >
                                تعديل
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDelete(
                                    expense.id
                                  )
                                }
                                className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                              >
                                حذف
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>

      {/* =======================================================
          MODAL
      ======================================================== */}

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            {/* رأس النافذة */}

            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                  <ExpenseIcon />
                </div>

                <div>
                  <p className="text-xs font-bold text-red-600">
                    عملية مالية
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-slate-950">
                    {editingId
                      ? "تعديل المصروف"
                      : "تسجيل مصروف"}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 disabled:opacity-50"
              >
                <CloseIcon />
              </button>
            </div>

            {/* محتوى */}

            <form
              onSubmit={handleSubmit}
              className="max-h-[82vh] overflow-y-auto px-5 py-6 sm:px-6"
            >
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    المبلغ
                  </label>

                  <div className="relative">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={amount}
                      onChange={(event) =>
                        setAmount(
                          event.target.value
                        )
                      }
                      required
                      autoFocus
                      placeholder="0.00"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 pl-14 text-lg font-semibold outline-none transition focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-50"
                    />

                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                      دج
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    التاريخ
                  </label>

                  <input
                    type="date"
                    value={date}
                    onChange={(event) =>
                      setDate(
                        event.target.value
                      )
                    }
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    التصنيف الرئيسي
                  </label>

                  <select
                    value={mainCategoryId}
                    onChange={(event) =>
                      handleMainCategoryChange(
                        event.target.value
                      )
                    }
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-50"
                  >
                    <option value="">
                      اختر التصنيف الرئيسي
                    </option>

                    {mainCategories.map(
                      (category) => (
                        <option
                          key={category.id}
                          value={category.id}
                        >
                          {category.name}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    التصنيف الفرعي
                  </label>

                  <select
                    value={subCategoryId}
                    onChange={(event) =>
                      setSubCategoryId(
                        event.target.value
                      )
                    }
                    disabled={
                      !mainCategoryId ||
                      formSubCategories.length ===
                        0
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">
                      {!mainCategoryId
                        ? "اختر الرئيسي أولًا"
                        : formSubCategories.length
                          ? "بدون تصنيف فرعي"
                          : "لا توجد تصنيفات فرعية"}
                    </option>

                    {formSubCategories.map(
                      (category) => (
                        <option
                          key={category.id}
                          value={category.id}
                        >
                          {category.name}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    الوصف
                  </label>

                  <input
                    type="text"
                    value={description}
                    onChange={(event) =>
                      setDescription(
                        event.target.value
                      )
                    }
                    placeholder="مثال: شراء حليب"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-50"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    ملاحظة
                  </label>

                  <textarea
                    value={note}
                    onChange={(event) =>
                      setNote(event.target.value)
                    }
                    rows={3}
                    placeholder="ملاحظات إضافية..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-50"
                  />
                </div>
              </div>

              {error && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-red-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "جارٍ الحفظ..."
                    : editingId
                      ? "حفظ التعديلات"
                      : "حفظ وتسجيل المصروف"}
                </button>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl bg-slate-100 px-5 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}