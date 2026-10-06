"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Income = {
  id: string;
  amount: number;
  income_date: string;
  description: string | null;
  note: string | null;
  category_id: string | null;
  category_name: string | null;
  parent_category_name: string | null;
};

type IncomeCategory = {
  id: string;
  name: string;
  parent_id: string | null;
  is_active: boolean;
};

export default function IncomesPage() {
  const [userId, setUserId] = useState("");
  const [accountId, setAccountId] = useState("");

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [mainCategoryId, setMainCategoryId] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");

  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");

  const [categories, setCategories] = useState<IncomeCategory[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categoryParentId, setCategoryParentId] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("ar-DZ", {
      maximumFractionDigits: 2,
    }).format(value);

  const mainCategories = useMemo(
    () => categories.filter((category) => !category.parent_id),
    [categories]
  );

  const formSubCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          category.parent_id === mainCategoryId && category.is_active
      ),
    [categories, mainCategoryId]
  );

  const total = useMemo(
    () =>
      incomes.reduce(
        (sum, income) => sum + Number(income.amount),
        0
      ),
    [incomes]
  );

  const average = useMemo(
    () => (incomes.length > 0 ? total / incomes.length : 0),
    [incomes.length, total]
  );

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    setLoading(true);
    setError("");
    setMessage("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      setLoading(false);
      setError(authError.message);
      return;
    }

    if (!user) {
      setLoading(false);
      setError("يرجى تسجيل الدخول أولًا.");
      return;
    }

    setUserId(user.id);

    try {
      await Promise.all([
        loadAccount(user.id),
        loadCategories(user.id),
        loadIncomes(user.id),
      ]);
    } finally {
      setLoading(false);
    }
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
      .from("income_categories")
      .select("id, name, parent_id, is_active")
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
          id,
          name,
          parent_id
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

    const rawIncomes = data ?? [];

    const categoryIds = rawIncomes
      .map((income) => income.category_id)
      .filter((id): id is string => Boolean(id));

    let categoryMap = new Map<
      string,
      {
        name: string;
        parent_id: string | null;
      }
    >();

    if (categoryIds.length > 0) {
      const { data: categoryRows, error: categoryError } = await supabase
        .from("income_categories")
        .select("id, name, parent_id")
        .in("id", categoryIds)
        .eq("user_id", currentUserId);

      if (categoryError) {
        setError(categoryError.message);
      } else {
        categoryMap = new Map(
          (categoryRows ?? []).map((category) => [
            category.id,
            {
              name: category.name,
              parent_id: category.parent_id,
            },
          ])
        );
      }
    }

    const parentIds = Array.from(
      new Set(
        Array.from(categoryMap.values())
          .map((category) => category.parent_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    let parentMap = new Map<string, string>();

    if (parentIds.length > 0) {
      const { data: parentRows, error: parentError } = await supabase
        .from("income_categories")
        .select("id, name")
        .in("id", parentIds)
        .eq("user_id", currentUserId);

      if (parentError) {
        setError(parentError.message);
      } else {
        parentMap = new Map(
          (parentRows ?? []).map((category) => [
            category.id,
            category.name,
          ])
        );
      }
    }

    const formattedIncomes: Income[] = rawIncomes.map((income) => {
      const category = income.category_id
        ? categoryMap.get(income.category_id)
        : undefined;

      return {
        id: income.id,
        amount: Number(income.amount),
        income_date: income.income_date,
        description: income.description,
        note: income.note,
        category_id: income.category_id,
        category_name: category?.name ?? null,
        parent_category_name: category?.parent_id
          ? parentMap.get(category.parent_id) ?? null
          : null,
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
    setMainCategoryId("");
    setSubCategoryId("");
    setDescription("");
    setNote("");
    setEditingId(null);
  }

  function openAddModal() {
    resetForm();
    setMessage("");
    setError("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    resetForm();
  }

  function startEdit(income: Income) {
    const selectedCategory = categories.find(
      (category) => category.id === income.category_id
    );

    const selectedMainCategory = selectedCategory?.parent_id
      ? selectedCategory.parent_id
      : selectedCategory?.id ?? "";

    const selectedSubCategory = selectedCategory?.parent_id
      ? selectedCategory.id
      : "";

    setEditingId(income.id);
    setAmount(String(income.amount));
    setDate(income.income_date);
    setMainCategoryId(selectedMainCategory);
    setSubCategoryId(selectedSubCategory);
    setDescription(income.description ?? "");
    setNote(income.note ?? "");

    setMessage("");
    setError("");
    setShowModal(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    try {
      if (!userId) {
        throw new Error("لم يتم التعرف على المستخدم.");
      }

      const numericAmount = Number(amount);

      if (!amount || !Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw new Error("أدخل مبلغًا صحيحًا أكبر من صفر.");
      }

      if (!date) {
        throw new Error("اختر تاريخ المدخول.");
      }

      if (!mainCategoryId) {
        throw new Error("اختر التصنيف الرئيسي.");
      }

      const mainCategory = mainCategories.find(
        (category) => category.id === mainCategoryId
      );

      if (!mainCategory) {
        throw new Error("التصنيف الرئيسي غير صالح.");
      }

      if (
        subCategoryId &&
        !formSubCategories.some(
          (category) => category.id === subCategoryId
        )
      ) {
        throw new Error(
          "العنصر الفرعي المحدد غير تابع للتصنيف الرئيسي."
        );
      }

      const finalCategoryId = subCategoryId || mainCategoryId;

      const { data: validCategory, error: categoryCheckError } =
        await supabase
          .from("income_categories")
          .select("id")
          .eq("id", finalCategoryId)
          .eq("user_id", userId)
          .eq("is_active", true)
          .maybeSingle();

      if (categoryCheckError) {
        throw new Error(categoryCheckError.message);
      }

      if (!validCategory) {
        throw new Error("التصنيف المحدد غير صالح.");
      }

      const currentAccountId = await ensureAccount();

      const payload = {
        user_id: userId,
        account_id: currentAccountId,
        category_id: finalCategoryId,
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
        const { data: insertedIncome, error: insertError } =
          await supabase
            .from("incomes")
            .insert(payload)
            .select("id")
            .single();

        if (insertError) {
          throw new Error(insertError.message);
        }

        if (!insertedIncome?.id) {
          throw new Error("لم يتم تأكيد تسجيل المدخول.");
        }

        setMessage("تم تسجيل المدخول بنجاح.");
      }

      setShowModal(false);
      resetForm();

      try {
        await loadIncomes(userId);
      } catch {
        setMessage(
          editingId
            ? "تم تعديل المدخول، لكن تعذر تحديث القائمة."
            : "تم تسجيل المدخول، لكن تعذر تحديث القائمة."
        );
      }
    } catch (submitError) {
      console.error("Income save error:", submitError);

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
      "هل أنت متأكد من حذف هذا المدخول؟\n\nلا يمكن التراجع عن الحذف."
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(id);
    setError("");
    setMessage("");

    try {
      const { error: deleteError } = await supabase
        .from("incomes")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      if (editingId === id) {
        setShowModal(false);
        resetForm();
      }

      setMessage("تم حذف المدخول بنجاح.");

      await loadIncomes(userId);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "تعذر حذف المدخول."
      );
    } finally {
      setDeletingId(null);
    }
  }

  function openCategoryModal(parentId = "") {
    setCategoryName("");
    setCategoryDescription("");
    setCategoryParentId(parentId);
    setMessage("");
    setError("");
    setShowCategoryModal(true);
  }

  async function handleCreateCategory(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSavingCategory(true);
    setMessage("");
    setError("");

    try {
      if (!userId) {
        throw new Error("لم يتم التعرف على المستخدم.");
      }

      const cleanName = categoryName.trim();

      if (!cleanName) {
        throw new Error("أدخل اسم التصنيف.");
      }

      if (cleanName.length < 2) {
        throw new Error("اسم التصنيف قصير جدًا.");
      }

      if (categoryParentId) {
        const parentExists = mainCategories.some(
          (category) => category.id === categoryParentId
        );

        if (!parentExists) {
          throw new Error("التصنيف الرئيسي المحدد غير صالح.");
        }
      }

      const duplicate = categories.some(
        (category) =>
          category.name.trim().toLowerCase() ===
            cleanName.toLowerCase() &&
          (category.parent_id ?? "") === categoryParentId
      );

      if (duplicate) {
        throw new Error("يوجد تصنيف بنفس الاسم بالفعل.");
      }

      const { data: created, error: createError } = await supabase
        .from("income_categories")
        .insert({
          user_id: userId,
          name: cleanName,
          description: categoryDescription.trim() || null,
          parent_id: categoryParentId || null,
          is_active: true,
        })
        .select("id, name, parent_id, is_active")
        .single();

      if (createError) {
        throw new Error(createError.message);
      }

      if (!created) {
        throw new Error("تعذر تأكيد إنشاء التصنيف.");
      }

      await loadCategories(userId);

      if (categoryParentId) {
        setMainCategoryId(categoryParentId);
        setSubCategoryId(created.id);
      } else {
        setMainCategoryId(created.id);
        setSubCategoryId("");
      }

      setShowCategoryModal(false);
      setCategoryName("");
      setCategoryDescription("");
      setCategoryParentId("");

      setMessage(
        categoryParentId
          ? "تم إنشاء العنصر الفرعي بنجاح."
          : "تم إنشاء التصنيف الرئيسي بنجاح."
      );
    } catch (categoryError) {
      console.error("Income category error:", categoryError);

      setError(
        categoryError instanceof Error
          ? categoryError.message
          : "تعذر إنشاء التصنيف."
      );
    } finally {
      setSavingCategory(false);
    }
  }

  function getCategoryLabel(income: Income) {
    if (!income.category_name) {
      return "بدون تصنيف";
    }

    if (income.parent_category_name) {
      return `${income.parent_category_name} ← ${income.category_name}`;
    }

    return income.category_name;
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50/40"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-green-700 via-green-600 to-emerald-500 p-6 text-white shadow-xl shadow-green-100 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                  <span className="h-2 w-2 rounded-full bg-white" />
                  التسيير المالي الشخصي
                </div>

                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                  المداخيل
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-green-50 sm:text-base">
                  إدارة ومتابعة جميع مصادر الدخل بطريقة منظمة وواضحة.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={openAddModal}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-green-700 shadow-lg transition hover:bg-green-50 active:scale-[0.98]"
                >
                  + تسجيل مدخول
                </button>

                <Link
                  href="/"
                  className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-bold text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20"
                >
                  الرئيسية
                </Link>

                <Link
                  href="/settings"
                  className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-bold text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20"
                >
                  الإعدادات
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Messages */}
        {(message || error) && (
          <div className="mb-6 space-y-3">
            {message && (
              <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-4 text-sm font-semibold text-green-800 shadow-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
                  ✓
                </span>

                <div className="pt-1">{message}</div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-semibold text-red-800 shadow-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-600 text-white">
                  !
                </span>

                <div className="pt-1 break-words">{error}</div>
              </div>
            )}
          </div>
        )}

        {/* Statistics */}
        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-green-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-100 text-xl text-green-700">
                دج
              </div>

              <span className="text-xs font-semibold text-slate-400">
                إجمالي المداخيل
              </span>
            </div>

            <p className="text-2xl font-black text-slate-900">
              {formatMoney(total)}
            </p>

            <p className="mt-1 text-xs font-medium text-green-600">
              الدينار الجزائري
            </p>
          </div>

          <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-xl text-blue-700">
                #
              </div>

              <span className="text-xs font-semibold text-slate-400">
                العمليات
              </span>
            </div>

            <p className="text-2xl font-black text-slate-900">
              {incomes.length}
            </p>

            <p className="mt-1 text-xs font-medium text-blue-600">
              عملية مسجلة
            </p>
          </div>

          <div className="rounded-3xl border border-purple-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-100 text-xl text-purple-700">
                ≈
              </div>

              <span className="text-xs font-semibold text-slate-400">
                متوسط المدخول
              </span>
            </div>

            <p className="text-2xl font-black text-slate-900">
              {formatMoney(average)}
            </p>

            <p className="mt-1 text-xs font-medium text-purple-600">
              لكل عملية
            </p>
          </div>

          <div className="rounded-3xl border border-amber-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-xl text-amber-700">
                ⌁
              </div>

              <span className="text-xs font-semibold text-slate-400">
                التصنيفات
              </span>
            </div>

            <p className="text-2xl font-black text-slate-900">
              {mainCategories.length}
            </p>

            <p className="mt-1 text-xs font-medium text-amber-600">
              تصنيف رئيسي
            </p>
          </div>
        </section>

        {/* Category overview */}
        <section className="mb-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                تصنيفات المداخيل
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                يمكنك تنظيم مصادر الدخل إلى تصنيفات رئيسية وعناصر فرعية.
              </p>
            </div>

            <button
              type="button"
              onClick={() => openCategoryModal()}
              className="rounded-xl bg-green-50 px-4 py-2.5 text-sm font-bold text-green-700 transition hover:bg-green-100"
            >
              + تصنيف رئيسي
            </button>
          </div>

          {mainCategories.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
              <p className="font-semibold text-slate-700">
                لا توجد تصنيفات رئيسية.
              </p>

              <p className="mt-1 text-sm text-slate-500">
                أنشئ أول تصنيف لتنظيم المداخيل.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {mainCategories.map((category) => {
                const children = categories.filter(
                  (item) => item.parent_id === category.id
                );

                return (
                  <div
                    key={category.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-900">
                          {category.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {children.length} عنصر فرعي
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => openCategoryModal(category.id)}
                        className="shrink-0 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-green-700 shadow-sm hover:bg-green-50"
                      >
                        + فرعي
                      </button>
                    </div>

                    {children.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {children.map((child) => (
                          <span
                            key={child.id}
                            className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm"
                          >
                            {child.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Income list */}
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                سجل المداخيل
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                جميع العمليات المالية المسجلة.
              </p>
            </div>

            <div className="rounded-2xl bg-green-50 px-4 py-3 text-right">
              <p className="text-xs font-medium text-slate-500">
                إجمالي المداخيل
              </p>

              <p className="mt-1 text-lg font-black text-green-700">
                {formatMoney(total)} دج
              </p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-28 animate-pulse rounded-2xl bg-slate-100"
                />
              ))}
            </div>
          ) : incomes.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-green-100 text-2xl text-green-700">
                دج
              </div>

              <h3 className="mt-4 font-bold text-slate-800">
                لا توجد مداخيل مسجلة
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                ابدأ بتسجيل أول مدخول في النظام.
              </p>

              <button
                type="button"
                onClick={openAddModal}
                className="mt-5 rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-green-700"
              >
                + تسجيل أول مدخول
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {incomes.map((income) => (
                <div
                  key={income.id}
                  className="group rounded-2xl border border-slate-100 bg-white p-4 transition hover:border-green-100 hover:bg-green-50/20 hover:shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-100 text-green-700">
                        +
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-bold text-slate-900">
                            {income.description || "مدخول"}
                          </h3>

                          {income.category_name ? (
                            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                              {getCategoryLabel(income)}
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                              بدون تصنيف
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                          <span>📅 {income.income_date}</span>

                          {income.note && (
                            <span className="max-w-full truncate">
                              📝 {income.note}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="text-right">
                        <p className="text-xl font-black text-green-600">
                          +{formatMoney(Number(income.amount))} دج
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(income)}
                          disabled={deletingId === income.id}
                          className="rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                        >
                          تعديل
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(income.id)}
                          disabled={deletingId === income.id}
                          className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          {deletingId === income.id
                            ? "جارٍ الحذف..."
                            : "حذف"}
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

      {/* Income modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-5 py-5 backdrop-blur sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-2 inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                    {editingId ? "تعديل عملية" : "عملية جديدة"}
                  </div>

                  <h2 className="text-2xl font-black text-slate-900">
                    {editingId
                      ? "تعديل المدخول"
                      : "تسجيل مدخول جديد"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    أدخل بيانات العملية المالية بدقة.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl text-slate-500 transition hover:bg-slate-200 disabled:opacity-50"
                >
                  ×
                </button>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-5 sm:p-6"
            >
              <div className="rounded-2xl bg-green-50 p-4">
                <label className="mb-2 block text-sm font-bold text-green-900">
                  مبلغ المدخول
                </label>

                <div className="relative">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(event) =>
                      setAmount(event.target.value)
                    }
                    required
                    autoFocus
                    className="w-full rounded-2xl border border-green-200 bg-white px-4 py-4 pl-16 text-xl font-black text-slate-900 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
                    placeholder="0.00"
                  />

                  <span className="absolute left-4 top-1/2 -translate-y-1/2 rounded-lg bg-green-100 px-2 py-1 text-sm font-bold text-green-700">
                    دج
                  </span>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    التاريخ
                  </label>

                  <input
                    type="date"
                    value={date}
                    onChange={(event) =>
                      setDate(event.target.value)
                    }
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    التصنيف الرئيسي
                  </label>

                  <select
                    value={mainCategoryId}
                    onChange={(event) => {
                      setMainCategoryId(event.target.value);
                      setSubCategoryId("");
                    }}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
                  >
                    <option value="">
                      اختر التصنيف الرئيسي
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
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    العنصر الفرعي
                  </label>

                  <select
                    value={subCategoryId}
                    onChange={(event) =>
                      setSubCategoryId(event.target.value)
                    }
                    disabled={!mainCategoryId}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="">
                      {mainCategoryId
                        ? "بدون عنصر فرعي"
                        : "اختر التصنيف الرئيسي أولًا"}
                    </option>

                    {formSubCategories.map((category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    ))}
                  </select>

                  {mainCategoryId &&
                    formSubCategories.length === 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          openCategoryModal(mainCategoryId)
                        }
                        className="mt-2 text-xs font-bold text-green-600 hover:text-green-700"
                      >
                        + إضافة عنصر فرعي
                      </button>
                    )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    الوصف
                  </label>

                  <input
                    type="text"
                    value={description}
                    onChange={(event) =>
                      setDescription(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
                    placeholder="راتب، عمل إضافي، بيع..."
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  ملاحظة
                </label>

                <textarea
                  value={note}
                  onChange={(event) =>
                    setNote(event.target.value)
                  }
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
                  placeholder="ملاحظات إضافية..."
                />
              </div>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
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
                  disabled={saving || loading}
                  className="flex-1 rounded-xl bg-green-600 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-green-100 transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "جارٍ الحفظ..."
                    : editingId
                      ? "حفظ التعديلات"
                      : "حفظ المدخول"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-2 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                    {categoryParentId
                      ? "عنصر فرعي"
                      : "تصنيف رئيسي"}
                  </div>

                  <h2 className="text-xl font-black text-slate-900">
                    {categoryParentId
                      ? "إضافة عنصر فرعي"
                      : "إضافة تصنيف رئيسي"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    تنظيم مصادر المداخيل بطريقة أفضل.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  disabled={savingCategory}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xl text-slate-500 hover:bg-slate-200"
                >
                  ×
                </button>
              </div>
            </div>

            <form
              onSubmit={handleCreateCategory}
              className="space-y-5 p-5 sm:p-6"
            >
              {categoryParentId && (
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
                  <span className="text-slate-500">
                    التصنيف الرئيسي:
                  </span>

                  <span className="mr-2 font-bold text-slate-800">
                    {
                      mainCategories.find(
                        (category) =>
                          category.id === categoryParentId
                      )?.name
                    }
                  </span>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  اسم التصنيف
                </label>

                <input
                  type="text"
                  value={categoryName}
                  onChange={(event) =>
                    setCategoryName(event.target.value)
                  }
                  required
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
                  placeholder={
                    categoryParentId
                      ? "مثال: راتب"
                      : "مثال: العمل"
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  الوصف
                </label>

                <textarea
                  value={categoryDescription}
                  onChange={(event) =>
                    setCategoryDescription(event.target.value)
                  }
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
                  placeholder="وصف اختياري..."
                />
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  disabled={savingCategory}
                  className="flex-1 rounded-xl bg-slate-100 px-4 py-3 font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={savingCategory}
                  className="flex-1 rounded-xl bg-green-600 px-4 py-3 font-bold text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {savingCategory
                    ? "جارٍ الحفظ..."
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