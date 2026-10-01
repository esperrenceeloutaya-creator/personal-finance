"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type IncomeCategory = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
};

type ExpenseCategory = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  parent_id: string | null;
};

export default function SettingsPage() {
  const [userId, setUserId] = useState("");

  const [incomeCategories, setIncomeCategories] = useState<
    IncomeCategory[]
  >([]);

  const [expenseCategories, setExpenseCategories] = useState<
    ExpenseCategory[]
  >([]);

  const [loading, setLoading] = useState(true);

  // الإيرادات
  const [incomeName, setIncomeName] = useState("");
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(
    null
  );
  const [savingIncome, setSavingIncome] = useState(false);

  // المصاريف - التصنيف الرئيسي
  const [showMainForm, setShowMainForm] = useState(false);
  const [mainCategoryName, setMainCategoryName] = useState("");
  const [editingMainId, setEditingMainId] = useState<string | null>(null);
  const [savingMain, setSavingMain] = useState(false);

  // المصاريف - التصنيف الفرعي
  const [selectedMainId, setSelectedMainId] = useState<string | null>(
    null
  );
  const [showSubForm, setShowSubForm] = useState(false);
  const [subCategoryName, setSubCategoryName] = useState("");
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [savingSub, setSavingSub] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
      loadIncomeCategories(user.id),
      loadExpenseCategories(user.id),
    ]);

    setLoading(false);
  }

  async function loadIncomeCategories(currentUserId = userId) {
    if (!currentUserId) return;

    const { data, error: loadError } = await supabase
      .from("income_categories")
      .select("id, name, description, is_active")
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

  const mainExpenseCategories = expenseCategories.filter(
    (category) => category.parent_id === null
  );

  function getChildren(parentId: string) {
    return expenseCategories.filter(
      (category) => category.parent_id === parentId
    );
  }

  function clearMessages() {
    setMessage("");
    setError("");
  }

  // =========================================================
  // الإيرادات
  // =========================================================

  async function submitIncomeCategory(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const cleanName = incomeName.trim();

    if (!cleanName) {
      setError("أدخل اسم تصنيف المدخول.");
      return;
    }

    setSavingIncome(true);
    clearMessages();

    try {
      if (editingIncomeId) {
        const { error: updateError } = await supabase
          .from("income_categories")
          .update({
            name: cleanName,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingIncomeId)
          .eq("user_id", userId);

        if (updateError) {
          throw new Error(updateError.message);
        }

        setMessage("تم تعديل تصنيف المدخول بنجاح.");
      } else {
        const { error: insertError } = await supabase
          .from("income_categories")
          .insert({
            user_id: userId,
            name: cleanName,
          });

        if (insertError) {
          throw new Error(insertError.message);
        }

        setMessage("تمت إضافة تصنيف المدخول بنجاح.");
      }

      setIncomeName("");
      setEditingIncomeId(null);

      await loadIncomeCategories();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "حدث خطأ أثناء حفظ تصنيف المدخول."
      );
    } finally {
      setSavingIncome(false);
    }
  }

  function editIncome(category: IncomeCategory) {
    clearMessages();
    setEditingIncomeId(category.id);
    setIncomeName(category.name);

    document
      .getElementById("income-section")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }

  async function deleteIncome(category: IncomeCategory) {
    const confirmed = window.confirm(
      `هل تريد حذف تصنيف "${category.name}"؟`
    );

    if (!confirmed) return;

    clearMessages();

    const { error: deleteError } = await supabase
      .from("income_categories")
      .delete()
      .eq("id", category.id)
      .eq("user_id", userId);

    if (deleteError) {
      setError(
        deleteError.message.includes("foreign key")
          ? "لا يمكن حذف التصنيف لأنه مستخدم في مداخيل مسجلة."
          : deleteError.message
      );
      return;
    }

    setMessage("تم حذف تصنيف المدخول بنجاح.");
    await loadIncomeCategories();
  }

  // =========================================================
  // التصنيف الرئيسي للمصاريف
  // =========================================================

  function openNewMainForm() {
    clearMessages();

    setShowMainForm(true);
    setEditingMainId(null);
    setMainCategoryName("");

    setSelectedMainId(null);
    setShowSubForm(false);
    setSubCategoryName("");
    setEditingSubId(null);

    setTimeout(() => {
      document
        .getElementById("main-category-form")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }, 50);
  }

  function editMain(category: ExpenseCategory) {
    clearMessages();

    setShowMainForm(true);
    setEditingMainId(category.id);
    setMainCategoryName(category.name);

    setSelectedMainId(category.id);
    setShowSubForm(true);
    setSubCategoryName("");
    setEditingSubId(null);

    setTimeout(() => {
      document
        .getElementById("main-category-form")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }, 50);
  }

  async function submitMainCategory(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const cleanName = mainCategoryName.trim();

    if (!cleanName) {
      setError("أدخل اسم التصنيف الرئيسي.");
      return;
    }

    setSavingMain(true);
    clearMessages();

    try {
      if (editingMainId) {
        const { error: updateError } = await supabase
          .from("expense_categories")
          .update({
            name: cleanName,
            parent_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingMainId)
          .eq("user_id", userId);

        if (updateError) {
          throw new Error(updateError.message);
        }

        setSelectedMainId(editingMainId);

        setShowSubForm(true);

        setMessage(
          `تم تعديل التصنيف الرئيسي "${cleanName}" بنجاح.`
        );
      } else {
        const { data: created, error: insertError } = await supabase
          .from("expense_categories")
          .insert({
            user_id: userId,
            name: cleanName,
            parent_id: null,
          })
          .select("id, name, description, is_active, parent_id")
          .single();

        if (insertError || !created) {
          throw new Error(
            insertError?.message ??
              "تعذر إنشاء التصنيف الرئيسي."
          );
        }

        setSelectedMainId(created.id);
        setShowSubForm(true);

        setMessage(
          `تم إنشاء التصنيف الرئيسي "${cleanName}". يمكنك الآن إضافة التصنيفات الفرعية التابعة له.`
        );
      }

      setMainCategoryName("");
      setEditingMainId(null);
      setShowMainForm(false);

      await loadExpenseCategories();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "حدث خطأ أثناء حفظ التصنيف الرئيسي."
      );
    } finally {
      setSavingMain(false);
    }
  }

  async function deleteMain(category: ExpenseCategory) {
    const children = getChildren(category.id);

    const confirmed = window.confirm(
      children.length > 0
        ? `التصنيف "${category.name}" يحتوي على ${children.length} تصنيف فرعي.\n\nسيتم حذف التصنيف الرئيسي والتصنيفات الفرعية التابعة له.\n\nهل تريد المتابعة؟`
        : `هل تريد حذف التصنيف الرئيسي "${category.name}"؟`
    );

    if (!confirmed) return;

    clearMessages();

    const { error: deleteError } = await supabase
      .from("expense_categories")
      .delete()
      .eq("id", category.id)
      .eq("user_id", userId);

    if (deleteError) {
      setError(
        deleteError.message.includes("foreign key")
          ? "لا يمكن حذف هذا التصنيف لأنه مستخدم في مصاريف مسجلة."
          : deleteError.message
      );
      return;
    }

    if (selectedMainId === category.id) {
      setSelectedMainId(null);
      setShowSubForm(false);
      setSubCategoryName("");
      setEditingSubId(null);
    }

    setMessage("تم حذف التصنيف الرئيسي بنجاح.");

    await loadExpenseCategories();
  }

  function selectMainCategory(category: ExpenseCategory) {
    clearMessages();

    setSelectedMainId(category.id);
    setShowSubForm(true);
    setEditingSubId(null);
    setSubCategoryName("");

    setTimeout(() => {
      document
        .getElementById("sub-category-section")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }, 50);
  }

  function cancelMainForm() {
    setShowMainForm(false);
    setEditingMainId(null);
    setMainCategoryName("");
    clearMessages();
  }

  // =========================================================
  // التصنيف الفرعي للمصاريف
  // =========================================================

  function openNewSubForm(parentId: string) {
    clearMessages();

    setSelectedMainId(parentId);
    setShowSubForm(true);
    setSubCategoryName("");
    setEditingSubId(null);

    setTimeout(() => {
      document
        .getElementById("sub-category-section")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }, 50);
  }

  function editSub(
    category: ExpenseCategory,
    parentId: string
  ) {
    clearMessages();

    setSelectedMainId(parentId);
    setShowSubForm(true);
    setEditingSubId(category.id);
    setSubCategoryName(category.name);

    setTimeout(() => {
      document
        .getElementById("sub-category-section")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }, 50);
  }

  async function submitSubCategory(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const cleanName = subCategoryName.trim();

    if (!selectedMainId) {
      setError("اختر التصنيف الرئيسي أولًا.");
      return;
    }

    if (!cleanName) {
      setError("أدخل اسم التصنيف الفرعي.");
      return;
    }

    setSavingSub(true);
    clearMessages();

    try {
      const parentCategory = mainExpenseCategories.find(
        (category) => category.id === selectedMainId
      );

      if (!parentCategory) {
        throw new Error("التصنيف الرئيسي غير موجود.");
      }

      if (editingSubId) {
        const { error: updateError } = await supabase
          .from("expense_categories")
          .update({
            name: cleanName,
            parent_id: selectedMainId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingSubId)
          .eq("user_id", userId);

        if (updateError) {
          throw new Error(updateError.message);
        }

        setMessage("تم تعديل التصنيف الفرعي بنجاح.");
      } else {
        const { error: insertError } = await supabase
          .from("expense_categories")
          .insert({
            user_id: userId,
            name: cleanName,
            parent_id: selectedMainId,
          });

        if (insertError) {
          throw new Error(insertError.message);
        }

        setMessage(
          `تمت إضافة "${cleanName}" إلى "${parentCategory.name}" بنجاح.`
        );
      }

      setSubCategoryName("");
      setEditingSubId(null);

      await loadExpenseCategories();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "حدث خطأ أثناء حفظ التصنيف الفرعي."
      );
    } finally {
      setSavingSub(false);
    }
  }

  async function deleteSub(category: ExpenseCategory) {
    const confirmed = window.confirm(
      `هل تريد حذف التصنيف الفرعي "${category.name}"؟`
    );

    if (!confirmed) return;

    clearMessages();

    const { error: deleteError } = await supabase
      .from("expense_categories")
      .delete()
      .eq("id", category.id)
      .eq("user_id", userId);

    if (deleteError) {
      setError(
        deleteError.message.includes("foreign key")
          ? "لا يمكن حذف التصنيف لأنه مستخدم في مصروف مسجل."
          : deleteError.message
      );
      return;
    }

    if (editingSubId === category.id) {
      setEditingSubId(null);
      setSubCategoryName("");
    }

    setMessage("تم حذف التصنيف الفرعي بنجاح.");

    await loadExpenseCategories();
  }

  function cancelSubForm() {
    setShowSubForm(false);
    setEditingSubId(null);
    setSubCategoryName("");
    clearMessages();
  }

  const selectedMain = expenseCategories.find(
    (category) => category.id === selectedMainId
  );

  const selectedChildren = selectedMainId
    ? getChildren(selectedMainId)
    : [];

  if (!userId && !loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4">
          <section className="w-full rounded-3xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">
              يجب تسجيل الدخول
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              سجّل الدخول للوصول إلى الإعدادات.
            </p>

            <Link
              href="/login"
              className="mt-6 inline-flex rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
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
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* =====================================================
            HEADER
        ====================================================== */}

        <header className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-600">
                نظام التسيير المالي
              </p>

              <h1 className="mt-1 text-3xl font-bold text-slate-900">
                الإعدادات والتصنيفات
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                تنظيم المداخيل والمصاريف بطريقة بسيطة.
              </p>
            </div>

            <Link
              href="/"
              className="rounded-xl bg-slate-900 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-slate-800"
            >
              الرئيسية
            </Link>
          </div>
        </header>

        {/* =====================================================
            MESSAGES
        ====================================================== */}

        {message && (
          <div className="mb-4 rounded-2xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* ===================================================
              INCOME CATEGORIES
          ==================================================== */}

          <section
            id="income-section"
            className="rounded-3xl bg-white p-6 shadow-sm"
          >
            <div className="mb-6">
              <span className="inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                المداخيل
              </span>

              <h2 className="mt-3 text-2xl font-bold text-slate-900">
                تصنيفات المداخيل
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                مثل راتب، عمل إضافي، بيع...
              </p>
            </div>

            <form
              onSubmit={submitIncomeCategory}
              className="mb-6 flex flex-col gap-3 sm:flex-row"
            >
              <input
                type="text"
                value={incomeName}
                onChange={(event) =>
                  setIncomeName(event.target.value)
                }
                placeholder="اسم التصنيف"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />

              <button
                type="submit"
                disabled={savingIncome || loading}
                className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
              >
                {savingIncome
                  ? "جارٍ الحفظ..."
                  : editingIncomeId
                    ? "حفظ التعديل"
                    : "إضافة"}
              </button>

              {editingIncomeId && (
                <button
                  type="button"
                  onClick={() => {
                    setIncomeName("");
                    setEditingIncomeId(null);
                    clearMessages();
                  }}
                  className="rounded-xl bg-slate-100 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-200"
                >
                  إلغاء
                </button>
              )}
            </form>

            {loading ? (
              <p className="text-sm text-slate-500">
                جارٍ التحميل...
              </p>
            ) : incomeCategories.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                لا توجد تصنيفات مداخيل.
              </div>
            ) : (
              <div className="space-y-3">
                {incomeCategories.map((category) => (
                  <div
                    key={category.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {category.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        تصنيف مدخول
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => editIncome(category)}
                        className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        تعديل
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteIncome(category)}
                        className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ===================================================
              EXPENSE CATEGORIES
          ==================================================== */}

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="mb-6">
              <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                المصاريف
              </span>

              <h2 className="mt-3 text-2xl font-bold text-slate-900">
                تصنيفات المصاريف
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                ابدأ بتصنيف رئيسي، ثم أضف الأصناف الفرعية التابعة له.
              </p>
            </div>

            {/* =================================================
                MAIN CATEGORY BUTTON
            ================================================== */}

            {!showMainForm && (
              <button
                type="button"
                onClick={openNewMainForm}
                className="mb-6 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-red-200 bg-red-50 px-5 py-5 text-base font-bold text-red-700 transition hover:border-red-300 hover:bg-red-100"
              >
                <span className="text-2xl">+</span>
                <span>إضافة تصنيف رئيسي جديد</span>
              </button>
            )}

            {/* =================================================
                MAIN CATEGORY FORM
            ================================================== */}

            {showMainForm && (
              <div
                id="main-category-form"
                className="mb-6 rounded-2xl border-2 border-red-100 bg-red-50 p-5"
              >
                <div className="mb-4">
                  <p className="text-xs font-semibold text-red-600">
                    {editingMainId
                      ? "تعديل التصنيف الرئيسي"
                      : "تصنيف رئيسي جديد"}
                  </p>

                  <h3 className="mt-1 text-lg font-bold text-slate-900">
                    {editingMainId
                      ? "تعديل اسم التصنيف"
                      : "أضف تصنيفًا رئيسيًا"}
                  </h3>
                </div>

                <form
                  onSubmit={submitMainCategory}
                  className="space-y-3"
                >
                  <input
                    type="text"
                    value={mainCategoryName}
                    onChange={(event) =>
                      setMainCategoryName(event.target.value)
                    }
                    autoFocus
                    placeholder="مثال: مواد غذائية"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  />

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="submit"
                      disabled={savingMain}
                      className="flex-1 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {savingMain
                        ? "جارٍ الإنشاء..."
                        : editingMainId
                          ? "حفظ التصنيف"
                          : "إنشاء التصنيف الرئيسي"}
                    </button>

                    <button
                      type="button"
                      onClick={cancelMainForm}
                      className="rounded-xl bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* =================================================
                SELECTED MAIN CATEGORY
            ================================================== */}

            {selectedMain && showSubForm && (
              <div
                id="sub-category-section"
                className="mb-6 rounded-2xl border-2 border-blue-100 bg-blue-50 p-5"
              >
                <div className="mb-5">
                  <p className="text-xs font-semibold text-blue-600">
                    التصنيف الرئيسي
                  </p>

                  <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-2xl font-bold text-slate-900">
                      {selectedMain.name}
                    </h3>

                    <button
                      type="button"
                      onClick={cancelSubForm}
                      className="text-sm font-semibold text-slate-500 hover:text-slate-700"
                    >
                      إغلاق
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-4">
                  <div className="mb-4">
                    <h4 className="font-bold text-slate-900">
                      {editingSubId
                        ? "تعديل تصنيف فرعي"
                        : "إضافة تصنيف فرعي"}
                    </h4>

                    <p className="mt-1 text-sm text-slate-500">
                      هذا التصنيف سيكون تابعًا لـ{" "}
                      <strong>{selectedMain.name}</strong>.
                    </p>
                  </div>

                  <form
                    onSubmit={submitSubCategory}
                    className="space-y-3"
                  >
                    <input
                      type="text"
                      value={subCategoryName}
                      onChange={(event) =>
                        setSubCategoryName(event.target.value)
                      }
                      autoFocus
                      placeholder="مثال: حليب"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="submit"
                        disabled={savingSub}
                        className="flex-1 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        {savingSub
                          ? "جارٍ الحفظ..."
                          : editingSubId
                            ? "حفظ التعديل"
                            : "إضافة التصنيف الفرعي"}
                      </button>

                      {editingSubId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSubId(null);
                            setSubCategoryName("");
                            clearMessages();
                          }}
                          className="rounded-xl bg-slate-100 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-200"
                        >
                          إلغاء التعديل
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                <div className="mt-5">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-semibold text-slate-700">
                      التصنيفات الفرعية
                    </p>

                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-700">
                      {selectedChildren.length}
                    </span>
                  </div>

                  {selectedChildren.length === 0 ? (
                    <div className="rounded-2xl bg-white p-5 text-center text-sm text-slate-500">
                      لا توجد تصنيفات فرعية لهذا التصنيف.
                      <br />
                      أضف أول تصنيف فرعي الآن.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedChildren.map((child) => (
                        <div
                          key={child.id}
                          className="flex flex-col gap-3 rounded-xl bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-blue-500">
                              ↳
                            </span>

                            <div>
                              <p className="font-semibold text-slate-900">
                                {child.name}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                تابع لـ {selectedMain.name}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                editSub(
                                  child,
                                  selectedMain.id
                                )
                              }
                              className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                            >
                              تعديل
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteSub(child)}
                              className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                            >
                              حذف
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* =================================================
                MAIN CATEGORIES LIST
            ================================================== */}

            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">
                    التصنيفات الرئيسية
                  </h3>

                  <p className="mt-1 text-xs text-slate-400">
                    اختر أي تصنيف لإضافة الأصناف الفرعية التابعة له.
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  {mainExpenseCategories.length}
                </span>
              </div>

              {loading ? (
                <p className="text-sm text-slate-500">
                  جارٍ التحميل...
                </p>
              ) : mainExpenseCategories.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-6 text-center">
                  <p className="text-sm text-slate-500">
                    لم تتم إضافة أي تصنيف رئيسي بعد.
                  </p>

                  <button
                    type="button"
                    onClick={openNewMainForm}
                    className="mt-4 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    + إضافة أول تصنيف رئيسي
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {mainExpenseCategories.map((mainCategory) => {
                    const children = getChildren(mainCategory.id);
                    const selected =
                      selectedMainId === mainCategory.id;

                    return (
                      <div
                        key={mainCategory.id}
                        className={`rounded-2xl border p-4 transition ${
                          selected
                            ? "border-blue-200 bg-blue-50/40"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <button
                              type="button"
                              onClick={() =>
                                selectMainCategory(mainCategory)
                              }
                              className="text-right"
                            >
                              <div className="flex items-center gap-3">
                                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 font-bold text-red-600">
                                  {selected ? "✓" : "•"}
                                </span>

                                <div>
                                  <p className="font-bold text-slate-900">
                                    {mainCategory.name}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-400">
                                    {children.length} تصنيف فرعي
                                  </p>
                                </div>
                              </div>
                            </button>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  openNewSubForm(mainCategory.id)
                                }
                                className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                              >
                                + إضافة فرعي
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  editMain(mainCategory)
                                }
                                className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                              >
                                تعديل
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  deleteMain(mainCategory)
                                }
                                className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                              >
                                حذف
                              </button>
                            </div>
                          </div>

                          {children.length > 0 && (
                            <div className="border-t border-slate-100 pt-3">
                              <div className="flex flex-wrap gap-2">
                                {children.map((child) => (
                                  <button
                                    key={child.id}
                                    type="button"
                                    onClick={() =>
                                      editSub(
                                        child,
                                        mainCategory.id
                                      )
                                    }
                                    className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                                  >
                                    ↳ {child.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}