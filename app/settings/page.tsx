"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Tab = "income" | "expense";

type IncomeCategory = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  parent_id: string | null;
};

type ExpenseCategory = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  parent_id: string | null;
};

type ModalType =
  | "income-main"
  | "income-sub"
  | "expense-main"
  | "expense-sub"
  | null;

export default function SettingsPage() {
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<Tab>("income");

  const [incomeCategories, setIncomeCategories] = useState<
    IncomeCategory[]
  >([]);

  const [expenseCategories, setExpenseCategories] = useState<
    ExpenseCategory[]
  >([]);

  const [incomeOperations, setIncomeOperations] = useState<
    Record<string, number>
  >({});

  const [expenseOperations, setExpenseOperations] = useState<
    Record<string, number>
  >({});

  const [search, setSearch] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [modal, setModal] = useState<ModalType>(null);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formParentId, setFormParentId] = useState("");

  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );

  const formatNumber = (value: number) =>
    new Intl.NumberFormat("ar-DZ").format(value);

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    setLoading(true);
    clearMessages();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (!user) {
      setError("يرجى تسجيل الدخول أولًا.");
      setLoading(false);
      return;
    }

    setUserId(user.id);

    try {
      await Promise.all([
        loadIncomeCategories(user.id),
        loadExpenseCategories(user.id),
        loadOperationCounts(user.id),
      ]);
    } finally {
      setLoading(false);
    }
  }

  function clearMessages() {
    setMessage("");
    setError("");
  }

  // =========================================================
  // تحميل التصنيفات
  // =========================================================

  async function loadIncomeCategories(currentUserId = userId) {
    if (!currentUserId) return;

    const { data, error: loadError } = await supabase
      .from("income_categories")
      .select("id, name, description, is_active, parent_id")
      .eq("user_id", currentUserId)
      .order("name", { ascending: true });

    if (loadError) {
      setError(loadError.message);
      return;
    }

    setIncomeCategories(data ?? []);
  }

  async function loadExpenseCategories(currentUserId = userId) {
    if (!currentUserId) return;

    const { data, error: loadError } = await supabase
      .from("expense_categories")
      .select("id, name, description, is_active, parent_id")
      .eq("user_id", currentUserId)
      .order("name", { ascending: true });

    if (loadError) {
      setError(loadError.message);
      return;
    }

    setExpenseCategories(data ?? []);
  }

  // =========================================================
  // عدد العمليات
  // =========================================================

  async function loadOperationCounts(currentUserId = userId) {
    if (!currentUserId) return;

    const incomeResult = await supabase
      .from("incomes")
      .select("category_id")
      .eq("user_id", currentUserId);

    if (!incomeResult.error) {
      const counts: Record<string, number> = {};

      (incomeResult.data ?? []).forEach((item) => {
        if (item.category_id) {
          counts[item.category_id] =
            (counts[item.category_id] ?? 0) + 1;
        }
      });

      setIncomeOperations(counts);
    }

    const expenseResult = await supabase
      .from("expenses")
      .select("category_id")
      .eq("user_id", currentUserId);

    if (!expenseResult.error) {
      const counts: Record<string, number> = {};

      (expenseResult.data ?? []).forEach((item) => {
        if (item.category_id) {
          counts[item.category_id] =
            (counts[item.category_id] ?? 0) + 1;
        }
      });

      setExpenseOperations(counts);
    }
  }

  // =========================================================
  // التصنيفات الرئيسية
  // =========================================================

  const mainIncomeCategories = useMemo(
    () => incomeCategories.filter((category) => !category.parent_id),
    [incomeCategories]
  );

  const mainExpenseCategories = useMemo(
    () => expenseCategories.filter((category) => !category.parent_id),
    [expenseCategories]
  );

  const filteredIncomeCategories = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return mainIncomeCategories;
    }

    return mainIncomeCategories.filter((category) => {
      const children = incomeCategories.filter(
        (child) => child.parent_id === category.id
      );

      return (
        category.name.toLowerCase().includes(term) ||
        children.some((child) =>
          child.name.toLowerCase().includes(term)
        )
      );
    });
  }, [search, mainIncomeCategories, incomeCategories]);

  const filteredExpenseCategories = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return mainExpenseCategories;
    }

    return mainExpenseCategories.filter((category) => {
      const children = expenseCategories.filter(
        (child) => child.parent_id === category.id
      );

      return (
        category.name.toLowerCase().includes(term) ||
        children.some((child) =>
          child.name.toLowerCase().includes(term)
        )
      );
    });
  }, [search, mainExpenseCategories, expenseCategories]);

  const activeIncomeCount = incomeCategories.filter(
    (category) => category.is_active
  ).length;

  const activeExpenseCount = expenseCategories.filter(
    (category) => category.is_active
  ).length;

  const incomeSubCount = incomeCategories.filter(
    (category) => category.parent_id
  ).length;

  const expenseSubCount = expenseCategories.filter(
    (category) => category.parent_id
  ).length;

  // =========================================================
  // Helpers
  // =========================================================

  function getIncomeChildren(parentId: string) {
    return incomeCategories.filter(
      (category) => category.parent_id === parentId
    );
  }

  function getExpenseChildren(parentId: string) {
    return expenseCategories.filter(
      (category) => category.parent_id === parentId
    );
  }

  function getIncomeOperationCount(id: string) {
    return incomeOperations[id] ?? 0;
  }

  function getExpenseOperationCount(id: string) {
    return expenseOperations[id] ?? 0;
  }

  function getCategoryOperationCount(
    categoryId: string,
    type: Tab
  ) {
    const categories =
      type === "income"
        ? incomeCategories
        : expenseCategories;

    const operations =
      type === "income"
        ? incomeOperations
        : expenseOperations;

    const children = categories.filter(
      (category) => category.parent_id === categoryId
    );

    return (
      (operations[categoryId] ?? 0) +
      children.reduce(
        (sum, child) => sum + (operations[child.id] ?? 0),
        0
      )
    );
  }

  // =========================================================
  // فتح النوافذ
  // =========================================================

  function openAddMain(type: Tab) {
    clearMessages();

    setEditingId(null);
    setFormName("");
    setFormDescription("");
    setFormParentId("");

    setModal(
      type === "income" ? "income-main" : "expense-main"
    );
  }

  function openAddSub(type: Tab, parentId: string) {
    clearMessages();

    setEditingId(null);
    setFormName("");
    setFormDescription("");
    setFormParentId(parentId);

    setModal(
      type === "income" ? "income-sub" : "expense-sub"
    );
  }

  function openEditIncome(category: IncomeCategory) {
    clearMessages();

    setEditingId(category.id);
    setFormName(category.name);
    setFormDescription(category.description ?? "");
    setFormParentId(category.parent_id ?? "");

    setModal(
      category.parent_id ? "income-sub" : "income-main"
    );
  }

  function openEditExpense(category: ExpenseCategory) {
    clearMessages();

    setEditingId(category.id);
    setFormName(category.name);
    setFormDescription(category.description ?? "");
    setFormParentId(category.parent_id ?? "");

    setModal(
      category.parent_id ? "expense-sub" : "expense-main"
    );
  }

  function closeModal() {
    if (saving) return;

    setModal(null);
    setEditingId(null);
    setFormName("");
    setFormDescription("");
    setFormParentId("");
  }

  // =========================================================
  // حفظ تصنيف المدخول
  // =========================================================

  async function submitIncomeCategory(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const cleanName = formName.trim();

    if (!cleanName) {
      setError("أدخل اسم التصنيف.");
      return;
    }

    setSaving(true);
    clearMessages();

    try {
      const isSub = modal === "income-sub";
      const parentId = isSub ? formParentId || null : null;

      if (isSub && !parentId) {
        throw new Error("اختر التصنيف الرئيسي.");
      }

      if (parentId) {
        const parentExists = mainIncomeCategories.some(
          (category) => category.id === parentId
        );

        if (!parentExists) {
          throw new Error(
            "التصنيف الرئيسي المحدد غير صالح."
          );
        }
      }

      const duplicate = incomeCategories.some(
        (category) =>
          category.id !== editingId &&
          category.name.trim().toLowerCase() ===
            cleanName.toLowerCase() &&
          (category.parent_id ?? null) === parentId
      );

      if (duplicate) {
        throw new Error(
          "يوجد تصنيف بنفس الاسم في نفس المستوى."
        );
      }

      if (editingId) {
        const { error: updateError } = await supabase
          .from("income_categories")
          .update({
            name: cleanName,
            description: formDescription.trim() || null,
            parent_id: parentId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId)
          .eq("user_id", userId);

        if (updateError) {
          throw new Error(updateError.message);
        }

        setMessage(
          isSub
            ? "تم تعديل التصنيف الفرعي بنجاح."
            : "تم تعديل التصنيف الرئيسي بنجاح."
        );
      } else {
        const { error: insertError } = await supabase
          .from("income_categories")
          .insert({
            user_id: userId,
            name: cleanName,
            description: formDescription.trim() || null,
            parent_id: parentId,
            is_active: true,
          });

        if (insertError) {
          throw new Error(insertError.message);
        }

        setMessage(
          isSub
            ? "تمت إضافة التصنيف الفرعي بنجاح."
            : "تمت إضافة التصنيف الرئيسي بنجاح."
        );
      }

      closeModal();
      await loadIncomeCategories();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "حدث خطأ أثناء حفظ التصنيف."
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // حفظ تصنيف المصروف
  // =========================================================

  async function submitExpenseCategory(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const cleanName = formName.trim();

    if (!cleanName) {
      setError("أدخل اسم التصنيف.");
      return;
    }

    setSaving(true);
    clearMessages();

    try {
      const isSub = modal === "expense-sub";
      const parentId = isSub ? formParentId || null : null;

      if (isSub && !parentId) {
        throw new Error("اختر التصنيف الرئيسي.");
      }

      if (parentId) {
        const parentExists = mainExpenseCategories.some(
          (category) => category.id === parentId
        );

        if (!parentExists) {
          throw new Error(
            "التصنيف الرئيسي المحدد غير صالح."
          );
        }
      }

      const duplicate = expenseCategories.some(
        (category) =>
          category.id !== editingId &&
          category.name.trim().toLowerCase() ===
            cleanName.toLowerCase() &&
          (category.parent_id ?? null) === parentId
      );

      if (duplicate) {
        throw new Error(
          "يوجد تصنيف بنفس الاسم في نفس المستوى."
        );
      }

      if (editingId) {
        const { error: updateError } = await supabase
          .from("expense_categories")
          .update({
            name: cleanName,
            description: formDescription.trim() || null,
            parent_id: parentId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId)
          .eq("user_id", userId);

        if (updateError) {
          throw new Error(updateError.message);
        }

        setMessage(
          isSub
            ? "تم تعديل التصنيف الفرعي بنجاح."
            : "تم تعديل التصنيف الرئيسي بنجاح."
        );
      } else {
        const { error: insertError } = await supabase
          .from("expense_categories")
          .insert({
            user_id: userId,
            name: cleanName,
            description: formDescription.trim() || null,
            parent_id: parentId,
            is_active: true,
          });

        if (insertError) {
          throw new Error(insertError.message);
        }

        setMessage(
          isSub
            ? "تمت إضافة التصنيف الفرعي بنجاح."
            : "تمت إضافة التصنيف الرئيسي بنجاح."
        );
      }

      closeModal();
      await loadExpenseCategories();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "حدث خطأ أثناء حفظ التصنيف."
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // تفعيل / تعطيل
  // =========================================================

  async function toggleIncomeCategory(
    category: IncomeCategory
  ) {
    clearMessages();

    const newStatus = !category.is_active;

    const { error: updateError } = await supabase
      .from("income_categories")
      .update({
        is_active: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", category.id)
      .eq("user_id", userId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage(
      newStatus
        ? "تم تفعيل التصنيف."
        : "تم تعطيل التصنيف."
    );

    await loadIncomeCategories();
  }

  async function toggleExpenseCategory(
    category: ExpenseCategory
  ) {
    clearMessages();

    const newStatus = !category.is_active;

    const { error: updateError } = await supabase
      .from("expense_categories")
      .update({
        is_active: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", category.id)
      .eq("user_id", userId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage(
      newStatus
        ? "تم تفعيل التصنيف."
        : "تم تعطيل التصنيف."
    );

    await loadExpenseCategories();
  }

  // =========================================================
  // الحذف
  // =========================================================

  async function deleteIncomeCategory(
    category: IncomeCategory
  ) {
    const children = getIncomeChildren(category.id);

    const operations =
      getCategoryOperationCount(category.id, "income");

    if (operations > 0) {
      setError(
        `لا يمكن حذف "${category.name}" لأنه مرتبط بـ ${operations} عملية مالية. يمكنك تعطيله بدلًا من حذفه.`
      );
      return;
    }

    if (children.length > 0) {
      setError(
        `لا يمكن حذف "${category.name}" لأنه يحتوي على ${children.length} تصنيف فرعي. احذف التصنيفات الفرعية أولًا.`
      );
      return;
    }

    const confirmed = window.confirm(
      `هل تريد حذف تصنيف "${category.name}"؟`
    );

    if (!confirmed) return;

    setDeletingId(category.id);
    clearMessages();

    try {
      const { error: deleteError } = await supabase
        .from("income_categories")
        .delete()
        .eq("id", category.id)
        .eq("user_id", userId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      setMessage("تم حذف تصنيف المدخول بنجاح.");

      await loadIncomeCategories();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "تعذر حذف التصنيف."
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function deleteExpenseCategory(
    category: ExpenseCategory
  ) {
    const children = getExpenseChildren(category.id);

    const operations =
      getCategoryOperationCount(category.id, "expense");

    if (operations > 0) {
      setError(
        `لا يمكن حذف "${category.name}" لأنه مرتبط بـ ${operations} عملية مالية. يمكنك تعطيله بدلًا من حذفه.`
      );
      return;
    }

    if (children.length > 0) {
      setError(
        `لا يمكن حذف "${category.name}" لأنه يحتوي على ${children.length} تصنيف فرعي. احذف التصنيفات الفرعية أولًا.`
      );
      return;
    }

    const confirmed = window.confirm(
      `هل تريد حذف تصنيف "${category.name}"؟`
    );

    if (!confirmed) return;

    setDeletingId(category.id);
    clearMessages();

    try {
      const { error: deleteError } = await supabase
        .from("expense_categories")
        .delete()
        .eq("id", category.id)
        .eq("user_id", userId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      setMessage("تم حذف تصنيف المصروف بنجاح.");

      await loadExpenseCategories();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "تعذر حذف التصنيف."
      );
    } finally {
      setDeletingId(null);
    }
  }

  // =========================================================
  // تسجيل الدخول
  // =========================================================

  if (!userId && !loading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50"
      >
        <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4">
          <section className="w-full rounded-[2rem] border border-slate-100 bg-white p-8 text-center shadow-xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 text-2xl text-green-700">
              ⚙
            </div>

            <h1 className="mt-5 text-2xl font-black text-slate-900">
              يجب تسجيل الدخول
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              سجّل الدخول للوصول إلى إعدادات النظام.
            </p>

            <Link
              href="/login"
              className="mt-6 inline-flex rounded-xl bg-green-600 px-6 py-3 font-bold text-white shadow-lg shadow-green-100 transition hover:bg-green-700"
            >
              تسجيل الدخول
            </Link>
          </section>
        </div>
      </main>
    );
  }

  // =========================================================
  // الصفحة
  // =========================================================

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50/40"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* ===================================================
            HEADER
        =================================================== */}

        <header className="mb-6 overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-800 to-green-900 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                نظام التسيير المالي الشخصي
              </div>

              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                الإعدادات
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                إدارة وتنظيم تصنيفات المداخيل والمصاريف من مكان واحد.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/"
                className="rounded-xl bg-white/10 px-5 py-3 text-sm font-bold text-white ring-1 ring-white/15 transition hover:bg-white/20"
              >
                الرئيسية
              </Link>

              <Link
                href="/incomes"
                className="rounded-xl bg-green-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-green-900/20 transition hover:bg-green-400"
              >
                المداخيل
              </Link>

              <Link
                href="/expenses"
                className="rounded-xl bg-red-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-900/20 transition hover:bg-red-400"
              >
                المصاريف
              </Link>
            </div>
          </div>
        </header>

        {/* ===================================================
            MESSAGES
        =================================================== */}

        {(message || error) && (
          <div className="mb-6 space-y-3">
            {message && (
              <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-4 text-sm font-bold text-green-800">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
                  ✓
                </span>

                <p className="pt-1">{message}</p>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-bold text-red-800">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-600 text-white">
                  !
                </span>

                <p className="break-words pt-1">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* ===================================================
            STATISTICS
        =================================================== */}

        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-green-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-xl">
                💰
              </div>

              <span className="text-xs font-bold text-slate-400">
                تصنيفات المداخيل
              </span>
            </div>

            <p className="mt-5 text-3xl font-black text-slate-900">
              {incomeCategories.length}
            </p>

            <p className="mt-1 text-xs font-semibold text-green-600">
              {mainIncomeCategories.length} رئيسي ·{" "}
              {incomeSubCount} فرعي
            </p>
          </div>

          <div className="rounded-3xl border border-red-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-xl">
                💸
              </div>

              <span className="text-xs font-bold text-slate-400">
                تصنيفات المصاريف
              </span>
            </div>

            <p className="mt-5 text-3xl font-black text-slate-900">
              {expenseCategories.length}
            </p>

            <p className="mt-1 text-xs font-semibold text-red-600">
              {mainExpenseCategories.length} رئيسي ·{" "}
              {expenseSubCount} فرعي
            </p>
          </div>

          <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-xl">
                ✓
              </div>

              <span className="text-xs font-bold text-slate-400">
                تصنيفات نشطة
              </span>
            </div>

            <p className="mt-5 text-3xl font-black text-slate-900">
              {activeIncomeCount + activeExpenseCount}
            </p>

            <p className="mt-1 text-xs font-semibold text-blue-600">
              مداخيل ومصاريف
            </p>
          </div>

          <div className="rounded-3xl border border-purple-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-xl">
                ⚙
              </div>

              <span className="text-xs font-bold text-slate-400">
                حالة النظام
              </span>
            </div>

            <p className="mt-5 text-xl font-black text-green-600">
              جاهز
            </p>

            <p className="mt-1 text-xs font-semibold text-slate-400">
              إدارة التصنيفات
            </p>
          </div>
        </section>

        {/* ===================================================
            TABS
        =================================================== */}

        <section className="mb-6 rounded-3xl border border-slate-100 bg-white p-3 shadow-sm">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab("income");
                setSearch("");
                clearMessages();
              }}
              className={`rounded-2xl px-5 py-4 text-sm font-black transition ${
                activeTab === "income"
                  ? "bg-green-600 text-white shadow-lg shadow-green-100"
                  : "bg-slate-50 text-slate-600 hover:bg-green-50 hover:text-green-700"
              }`}
            >
              <span className="ml-2">💰</span>
              تصنيفات المداخيل
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("expense");
                setSearch("");
                clearMessages();
              }}
              className={`rounded-2xl px-5 py-4 text-sm font-black transition ${
                activeTab === "expense"
                  ? "bg-red-600 text-white shadow-lg shadow-red-100"
                  : "bg-slate-50 text-slate-600 hover:bg-red-50 hover:text-red-700"
              }`}
            >
              <span className="ml-2">💸</span>
              تصنيفات المصاريف
            </button>
          </div>
        </section>

        {/* ===================================================
            SEARCH + ACTION
        =================================================== */}

        <section className="mb-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                {activeTab === "income"
                  ? "إدارة تصنيفات المداخيل"
                  : "إدارة تصنيفات المصاريف"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                أضف التصنيفات الرئيسية ثم نظمها إلى عناصر فرعية.
              </p>
            </div>

            <button
              type="button"
              onClick={() => openAddMain(activeTab)}
              className={`rounded-xl px-5 py-3 text-sm font-black text-white shadow-lg transition ${
                activeTab === "income"
                  ? "bg-green-600 shadow-green-100 hover:bg-green-700"
                  : "bg-red-600 shadow-red-100 hover:bg-red-700"
              }`}
            >
              + إضافة تصنيف رئيسي
            </button>
          </div>

          <div className="mt-5">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="بحث عن تصنيف أو عنصر فرعي..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 pr-12 text-sm font-medium outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-50"
              />

              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg text-slate-400">
                ⌕
              </span>

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400 hover:text-slate-700"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ===================================================
            INCOME TABLE
        =================================================== */}

        {activeTab === "income" && (
          <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-green-50/50 px-5 py-5 sm:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    جدول تصنيفات المداخيل
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    {filteredIncomeCategories.length} تصنيف رئيسي
                  </p>
                </div>

                <span className="rounded-xl bg-green-100 px-3 py-2 text-xs font-black text-green-700">
                  {incomeCategories.length} إجمالي
                </span>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3 p-5">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-20 animate-pulse rounded-2xl bg-slate-100"
                  />
                ))}
              </div>
            ) : filteredIncomeCategories.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-green-100 text-2xl">
                  💰
                </div>

                <h3 className="mt-4 font-black text-slate-800">
                  {search
                    ? "لا توجد نتائج"
                    : "لا توجد تصنيفات مداخيل"}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {search
                    ? "جرب كلمة بحث أخرى."
                    : "أنشئ أول تصنيف رئيسي للمداخيل."}
                </p>

                {!search && (
                  <button
                    type="button"
                    onClick={() => openAddMain("income")}
                    className="mt-5 rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white hover:bg-green-700"
                  >
                    + إضافة تصنيف
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-right">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-xs font-black text-slate-500">
                      <th className="px-5 py-4">التصنيف</th>
                      <th className="px-5 py-4">النوع</th>
                      <th className="px-5 py-4">العناصر الفرعية</th>
                      <th className="px-5 py-4">العمليات</th>
                      <th className="px-5 py-4">الحالة</th>
                      <th className="px-5 py-4">الإجراءات</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredIncomeCategories.map(
                      (category) => {
                        const children =
                          getIncomeChildren(category.id);

                        return (
                          <IncomeTableRows
                            key={category.id}
                            category={category}
                            children={children}
                            operationCount={getIncomeOperationCount(
                              category.id
                            )}
                            totalOperations={getCategoryOperationCount(
                              category.id,
                              "income"
                            )}
                            deletingId={deletingId}
                            onAddSub={() =>
                              openAddSub(
                                "income",
                                category.id
                              )
                            }
                            onEdit={openEditIncome}
                            onDelete={deleteIncomeCategory}
                            onToggle={toggleIncomeCategory}
                            onSelect={setSelectedCategoryId}
                            selectedId={selectedCategoryId}
                          />
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ===================================================
            EXPENSE TABLE
        =================================================== */}

        {activeTab === "expense" && (
          <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-red-50/50 px-5 py-5 sm:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    جدول تصنيفات المصاريف
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    {filteredExpenseCategories.length} تصنيف رئيسي
                  </p>
                </div>

                <span className="rounded-xl bg-red-100 px-3 py-2 text-xs font-black text-red-700">
                  {expenseCategories.length} إجمالي
                </span>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3 p-5">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-20 animate-pulse rounded-2xl bg-slate-100"
                  />
                ))}
              </div>
            ) : filteredExpenseCategories.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-100 text-2xl">
                  💸
                </div>

                <h3 className="mt-4 font-black text-slate-800">
                  {search
                    ? "لا توجد نتائج"
                    : "لا توجد تصنيفات مصاريف"}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {search
                    ? "جرب كلمة بحث أخرى."
                    : "أنشئ أول تصنيف رئيسي للمصاريف."}
                </p>

                {!search && (
                  <button
                    type="button"
                    onClick={() => openAddMain("expense")}
                    className="mt-5 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700"
                  >
                    + إضافة تصنيف
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-right">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-xs font-black text-slate-500">
                      <th className="px-5 py-4">التصنيف</th>
                      <th className="px-5 py-4">النوع</th>
                      <th className="px-5 py-4">العناصر الفرعية</th>
                      <th className="px-5 py-4">العمليات</th>
                      <th className="px-5 py-4">الحالة</th>
                      <th className="px-5 py-4">الإجراءات</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredExpenseCategories.map(
                      (category) => {
                        const children =
                          getExpenseChildren(category.id);

                        return (
                          <ExpenseTableRows
                            key={category.id}
                            category={category}
                            children={children}
                            operationCount={getExpenseOperationCount(
                              category.id
                            )}
                            totalOperations={getCategoryOperationCount(
                              category.id,
                              "expense"
                            )}
                            deletingId={deletingId}
                            onAddSub={() =>
                              openAddSub(
                                "expense",
                                category.id
                              )
                            }
                            onEdit={openEditExpense}
                            onDelete={deleteExpenseCategory}
                            onToggle={toggleExpenseCategory}
                            onSelect={setSelectedCategoryId}
                            selectedId={selectedCategoryId}
                          />
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>

      {/* =====================================================
          CATEGORY MODAL
      ====================================================== */}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl">
            <div
              className={`border-b px-5 py-5 sm:px-6 ${
                modal.startsWith("income")
                  ? "border-green-100 bg-green-50/60"
                  : "border-red-100 bg-red-50/60"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                      modal.startsWith("income")
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {modal.includes("sub")
                      ? "تصنيف فرعي"
                      : "تصنيف رئيسي"}
                  </span>

                  <h2 className="mt-3 text-2xl font-black text-slate-900">
                    {editingId
                      ? "تعديل التصنيف"
                      : modal.includes("sub")
                        ? "إضافة تصنيف فرعي"
                        : "إضافة تصنيف رئيسي"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {modal.startsWith("income")
                      ? "تنظيم مصادر المداخيل."
                      : "تنظيم أنواع المصاريف."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-xl text-slate-500 shadow-sm transition hover:bg-slate-100 disabled:opacity-50"
                >
                  ×
                </button>
              </div>
            </div>

            <form
              onSubmit={
                modal.startsWith("income")
                  ? submitIncomeCategory
                  : submitExpenseCategory
              }
              className="space-y-5 p-5 sm:p-6"
            >
              {modal.includes("sub") && (
                <div className="rounded-2xl bg-slate-50 px-4 py-4">
                  <p className="text-xs font-semibold text-slate-400">
                    التصنيف الرئيسي
                  </p>

                  <p className="mt-1 font-black text-slate-800">
                    {modal.startsWith("income")
                      ? mainIncomeCategories.find(
                          (category) =>
                            category.id === formParentId
                        )?.name
                      : mainExpenseCategories.find(
                          (category) =>
                            category.id === formParentId
                        )?.name}
                  </p>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  اسم التصنيف
                </label>

                <input
                  type="text"
                  value={formName}
                  onChange={(event) =>
                    setFormName(event.target.value)
                  }
                  autoFocus
                  required
                  placeholder={
                    modal.includes("sub")
                      ? "مثال: راتب شهري"
                      : "مثال: العمل"
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  الوصف
                  <span className="mr-2 text-xs font-normal text-slate-400">
                    اختياري
                  </span>
                </label>

                <textarea
                  value={formDescription}
                  onChange={(event) =>
                    setFormDescription(event.target.value)
                  }
                  rows={3}
                  placeholder="وصف مختصر للتصنيف..."
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-medium outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-50"
                />
              </div>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  {error}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-slate-100 px-5 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className={`flex-1 rounded-xl px-5 py-3.5 text-sm font-black text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    modal.startsWith("income")
                      ? "bg-green-600 shadow-green-100 hover:bg-green-700"
                      : "bg-red-600 shadow-red-100 hover:bg-red-700"
                  }`}
                >
                  {saving
                    ? "جارٍ الحفظ..."
                    : editingId
                      ? "حفظ التعديلات"
                      : "حفظ التصنيف"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

/* =========================================================
   INCOME TABLE ROWS
========================================================= */

function IncomeTableRows({
  category,
  children,
  operationCount,
  totalOperations,
  deletingId,
  onAddSub,
  onEdit,
  onDelete,
  onToggle,
  onSelect,
  selectedId,
}: {
  category: IncomeCategory;
  children: IncomeCategory[];
  operationCount: number;
  totalOperations: number;
  deletingId: string | null;
  onAddSub: () => void;
  onEdit: (category: IncomeCategory) => void;
  onDelete: (category: IncomeCategory) => void;
  onToggle: (category: IncomeCategory) => void;
  onSelect: (id: string | null) => void;
  selectedId: string | null;
}) {
  return (
    <>
      <tr
        className={`border-b border-slate-100 transition ${
          selectedId === category.id
            ? "bg-green-50/60"
            : "hover:bg-slate-50"
        }`}
      >
        <td className="px-5 py-4">
          <button
            type="button"
            onClick={() =>
              onSelect(
                selectedId === category.id
                  ? null
                  : category.id
              )
            }
            className="flex items-center gap-3 text-right"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 font-black text-green-700">
              +
            </span>

            <div>
              <p className="font-black text-slate-900">
                {category.name}
              </p>

              {category.description && (
                <p className="mt-1 max-w-xs truncate text-xs text-slate-400">
                  {category.description}
                </p>
              )}
            </div>
          </button>
        </td>

        <td className="px-5 py-4">
          <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-black text-green-700">
            رئيسي
          </span>
        </td>

        <td className="px-5 py-4">
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
            {children.length}
          </span>
        </td>

        <td className="px-5 py-4">
          <span className="font-bold text-slate-700">
            {totalOperations}
          </span>
        </td>

        <td className="px-5 py-4">
          <button
            type="button"
            onClick={() => onToggle(category)}
            className={`rounded-full px-3 py-1.5 text-xs font-black ${
              category.is_active
                ? "bg-green-100 text-green-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {category.is_active ? "نشط" : "معطل"}
          </button>
        </td>

        <td className="px-5 py-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onAddSub}
              className="rounded-lg bg-green-50 px-3 py-2 text-xs font-black text-green-700 hover:bg-green-100"
            >
              + فرعي
            </button>

            <button
              type="button"
              onClick={() => onEdit(category)}
              className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100"
            >
              تعديل
            </button>

            <button
              type="button"
              disabled={deletingId === category.id}
              onClick={() => onDelete(category)}
              className="rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              {deletingId === category.id
                ? "..."
                : "حذف"}
            </button>
          </div>
        </td>
      </tr>

      {children.map((child) => (
        <tr
          key={child.id}
          className="border-b border-slate-50 bg-slate-50/40"
        >
          <td className="px-5 py-3 pr-12">
            <div className="flex items-center gap-3">
              <span className="text-green-500">↳</span>

              <div>
                <p className="font-bold text-slate-700">
                  {child.name}
                </p>

                {child.description && (
                  <p className="mt-1 text-xs text-slate-400">
                    {child.description}
                  </p>
                )}
              </div>
            </div>
          </td>

          <td className="px-5 py-3">
            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
              فرعي
            </span>
          </td>

          <td className="px-5 py-3 text-xs text-slate-400">
            —
          </td>

          <td className="px-5 py-3 font-bold text-slate-600">
            {operationCount}
          </td>

          <td className="px-5 py-3">
            <button
              type="button"
              onClick={() => onToggle(child)}
              className={`rounded-full px-3 py-1.5 text-xs font-black ${
                child.is_active
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {child.is_active ? "نشط" : "معطل"}
            </button>
          </td>

          <td className="px-5 py-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onEdit(child)}
                className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100"
              >
                تعديل
              </button>

              <button
                type="button"
                disabled={deletingId === child.id}
                onClick={() => onDelete(child)}
                className="rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                {deletingId === child.id ? "..." : "حذف"}
              </button>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

/* =========================================================
   EXPENSE TABLE ROWS
========================================================= */

function ExpenseTableRows({
  category,
  children,
  operationCount,
  totalOperations,
  deletingId,
  onAddSub,
  onEdit,
  onDelete,
  onToggle,
  onSelect,
  selectedId,
}: {
  category: ExpenseCategory;
  children: ExpenseCategory[];
  operationCount: number;
  totalOperations: number;
  deletingId: string | null;
  onAddSub: () => void;
  onEdit: (category: ExpenseCategory) => void;
  onDelete: (category: ExpenseCategory) => void;
  onToggle: (category: ExpenseCategory) => void;
  onSelect: (id: string | null) => void;
  selectedId: string | null;
}) {
  return (
    <>
      <tr
        className={`border-b border-slate-100 transition ${
          selectedId === category.id
            ? "bg-red-50/60"
            : "hover:bg-slate-50"
        }`}
      >
        <td className="px-5 py-4">
          <button
            type="button"
            onClick={() =>
              onSelect(
                selectedId === category.id
                  ? null
                  : category.id
              )
            }
            className="flex items-center gap-3 text-right"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 font-black text-red-700">
              −
            </span>

            <div>
              <p className="font-black text-slate-900">
                {category.name}
              </p>

              {category.description && (
                <p className="mt-1 max-w-xs truncate text-xs text-slate-400">
                  {category.description}
                </p>
              )}
            </div>
          </button>
        </td>

        <td className="px-5 py-4">
          <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-black text-red-700">
            رئيسي
          </span>
        </td>

        <td className="px-5 py-4">
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
            {children.length}
          </span>
        </td>

        <td className="px-5 py-4">
          <span className="font-bold text-slate-700">
            {totalOperations}
          </span>
        </td>

        <td className="px-5 py-4">
          <button
            type="button"
            onClick={() => onToggle(category)}
            className={`rounded-full px-3 py-1.5 text-xs font-black ${
              category.is_active
                ? "bg-green-100 text-green-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {category.is_active ? "نشط" : "معطل"}
          </button>
        </td>

        <td className="px-5 py-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onAddSub}
              className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100"
            >
              + فرعي
            </button>

            <button
              type="button"
              onClick={() => onEdit(category)}
              className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100"
            >
              تعديل
            </button>

            <button
              type="button"
              disabled={deletingId === category.id}
              onClick={() => onDelete(category)}
              className="rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              {deletingId === category.id
                ? "..."
                : "حذف"}
            </button>
          </div>
        </td>
      </tr>

      {children.map((child) => (
        <tr
          key={child.id}
          className="border-b border-slate-50 bg-slate-50/40"
        >
          <td className="px-5 py-3 pr-12">
            <div className="flex items-center gap-3">
              <span className="text-red-500">↳</span>

              <div>
                <p className="font-bold text-slate-700">
                  {child.name}
                </p>

                {child.description && (
                  <p className="mt-1 text-xs text-slate-400">
                    {child.description}
                  </p>
                )}
              </div>
            </div>
          </td>

          <td className="px-5 py-3">
            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
              فرعي
            </span>
          </td>

          <td className="px-5 py-3 text-xs text-slate-400">
            —
          </td>

          <td className="px-5 py-3 font-bold text-slate-600">
            {operationCount}
          </td>

          <td className="px-5 py-3">
            <button
              type="button"
              onClick={() => onToggle(child)}
              className={`rounded-full px-3 py-1.5 text-xs font-black ${
                child.is_active
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {child.is_active ? "نشط" : "معطل"}
            </button>
          </td>

          <td className="px-5 py-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onEdit(child)}
                className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100"
              >
                تعديل
              </button>

              <button
                type="button"
                disabled={deletingId === child.id}
                onClick={() => onDelete(child)}
                className="rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                {deletingId === child.id ? "..." : "حذف"}
              </button>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}