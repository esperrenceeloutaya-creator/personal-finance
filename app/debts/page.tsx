"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type DebtType = "owed_by_me" | "owed_to_me";
type TransactionType = "personal" | "work";

type Debt = {
  id: string;
  user_id: string;
  debt_type: DebtType;
  transaction_type: TransactionType;
  party_name: string;
  description: string | null;
  original_amount: number;
  paid_amount: number;
  remaining_amount: number;
  debt_date: string;
  due_date: string | null;
  calculated_status: "active" | "partially_paid" | "paid";
  note: string | null;
  created_at: string;
  updated_at: string;
};

type DebtPayment = {
  id: string;
  debt_id: string;
  amount: number;
  payment_date: string;
  transaction_type: TransactionType;
  payment_method: string | null;
  note: string | null;
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("ar-DZ", {
    maximumFractionDigits: 0,
  }).format(value) + " دج";

const formatDate = (value: string | null) => {
  if (!value) return "—";

  return new Intl.DateTimeFormat("ar-DZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
};

const today = () => new Date().toISOString().split("T")[0];

export default function DebtsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [debts, setDebts] = useState<Debt[]>([]);

  const [showDebtForm, setShowDebtForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  const [debtType, setDebtType] = useState<DebtType>("owed_by_me");
  const [transactionType, setTransactionType] =
    useState<TransactionType>("personal");
  const [partyName, setPartyName] = useState("");
  const [description, setDescription] = useState("");
  const [originalAmount, setOriginalAmount] = useState("");
  const [debtDate, setDebtDate] = useState(today());
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(today());
  const [paymentMethod, setPaymentMethod] = useState("نقدًا");
  const [paymentNote, setPaymentNote] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadDebts(currentUserId?: string) {
    setLoading(true);
    setError("");

    try {
      const id = currentUserId || userId;

      if (!id) return;

      const { data, error: queryError } = await supabase
        .from("debt_summary")
        .select("*")
        .eq("user_id", id)
        .order("created_at", { ascending: false });

      if (queryError) throw queryError;

      setDebts((data || []) as Debt[]);
    } catch (err) {
      console.error(err);
      setError("تعذر تحميل بيانات الديون");
    } finally {
      setLoading(false);
    }
  }

  async function initialize() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    setUserId(user.id);
    await loadDebts(user.id);
  }

  useEffect(() => {
    void initialize();
  }, []);

  const totals = useMemo(() => {
    const owedByMe = debts
      .filter((d) => d.debt_type === "owed_by_me")
      .reduce((sum, d) => sum + Number(d.remaining_amount || 0), 0);

    const owedToMe = debts
      .filter((d) => d.debt_type === "owed_to_me")
      .reduce((sum, d) => sum + Number(d.remaining_amount || 0), 0);

    const active = debts.filter(
      (d) => d.calculated_status !== "paid"
    ).length;

    return {
      owedByMe,
      owedToMe,
      active,
      total: debts.length,
    };
  }, [debts]);

  function resetDebtForm() {
    setDebtType("owed_by_me");
    setTransactionType("personal");
    setPartyName("");
    setDescription("");
    setOriginalAmount("");
    setDebtDate(today());
    setDueDate("");
    setNote("");
  }

  function openAddDebt() {
    setMessage("");
    setError("");
    resetDebtForm();
    setShowDebtForm(true);
  }

  function closeDebtForm() {
    if (!saving) {
      setShowDebtForm(false);
    }
  }

  async function handleAddDebt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId) {
      setError("جلسة المستخدم غير متوفرة");
      return;
    }

    const amount = Number(originalAmount);

    if (!partyName.trim()) {
      setError("أدخل اسم الشخص أو الجهة");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("أدخل مبلغًا صحيحًا أكبر من صفر");
      return;
    }

    if (!debtDate) {
      setError("اختر تاريخ الدين");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const { error: insertError } = await supabase.from("debts").insert({
        user_id: userId,
        debt_type: debtType,
        transaction_type: transactionType,
        party_name: partyName.trim(),
        description: description.trim() || null,
        original_amount: amount,
        debt_date: debtDate,
        due_date: dueDate || null,
        note: note.trim() || null,
      });

      if (insertError) throw insertError;

      setShowDebtForm(false);
      resetDebtForm();
      setMessage("تم تسجيل الدين بنجاح");
      await loadDebts();
    } catch (err) {
      console.error(err);
      setError("تعذر تسجيل الدين");
    } finally {
      setSaving(false);
    }
  }

  async function openPayments(debt: Debt) {
    setSelectedDebt(debt);
    setShowPaymentForm(false);
    setPayments([]);
    setPaymentsLoading(true);
    setMessage("");
    setError("");

    const { data, error: queryError } = await supabase
      .from("debt_payments")
      .select(
        "id, debt_id, amount, payment_date, transaction_type, payment_method, note"
      )
      .eq("debt_id", debt.id)
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (queryError) {
      console.error(queryError);
      setError("تعذر تحميل سجل الدفعات");
    } else {
      setPayments((data || []) as DebtPayment[]);
    }

    setPaymentsLoading(false);
  }

  function closePayments() {
    if (!paymentSaving) {
      setSelectedDebt(null);
      setShowPaymentForm(false);
      setPayments([]);
    }
  }

  function openPaymentForm() {
    if (!selectedDebt || Number(selectedDebt.remaining_amount) <= 0) {
      return;
    }

    setPaymentAmount("");
    setPaymentDate(today());
    setPaymentMethod("نقدًا");
    setPaymentNote("");
    setShowPaymentForm(true);
    setError("");
    setMessage("");
  }

  async function handlePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedDebt) return;

    const amount = Number(paymentAmount);
    const remaining = Number(selectedDebt.remaining_amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("أدخل مبلغ سداد صحيحًا");
      return;
    }

    if (amount > remaining) {
      setError(
        `مبلغ السداد أكبر من المتبقي (${formatMoney(remaining)})`
      );
      return;
    }

    setPaymentSaving(true);
    setError("");
    setMessage("");

    try {
      const { error: rpcError } = await supabase.rpc(
        "register_debt_payment",
        {
          p_debt_id: selectedDebt.id,
          p_amount: amount,
          p_payment_date: paymentDate,
          p_transaction_type: selectedDebt.transaction_type,
          p_payment_method: paymentMethod.trim() || null,
          p_note: paymentNote.trim() || null,
        }
      );

      if (rpcError) throw rpcError;

      setShowPaymentForm(false);
      setMessage("تم تسجيل السداد بنجاح");

      await loadDebts();

      const { data: updatedDebt, error: updatedDebtError } = await supabase
        .from("debt_summary")
        .select("*")
        .eq("id", selectedDebt.id)
        .single();

      if (updatedDebtError) {
        throw updatedDebtError;
      }

      setSelectedDebt(updatedDebt as Debt);

      const { data: updatedPayments } = await supabase
        .from("debt_payments")
        .select(
          "id, debt_id, amount, payment_date, transaction_type, payment_method, note"
        )
        .eq("debt_id", selectedDebt.id)
        .order("payment_date", { ascending: false })
        .order("created_at", { ascending: false });

      setPayments((updatedPayments || []) as DebtPayment[]);
    } catch (err) {
      console.error(err);
      setError("تعذر تسجيل السداد");
    } finally {
      setPaymentSaving(false);
    }
  }

  async function deleteDebt(debt: Debt) {
    const confirmed = window.confirm(
      `هل تريد حذف الدين الخاص بـ "${debt.party_name}"؟`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    const { error: deleteError } = await supabase
      .from("debts")
      .delete()
      .eq("id", debt.id);

    if (deleteError) {
      console.error(deleteError);
      setError("تعذر حذف الدين");
      return;
    }

    setMessage("تم حذف الدين");
    await loadDebts();

    if (selectedDebt?.id === debt.id) {
      closePayments();
    }
  }

  const statusLabel = (status: Debt["calculated_status"]) => {
    if (status === "paid") return "مسدد";
    if (status === "partially_paid") return "مسدد جزئيًا";
    return "نشط";
  };

  const statusClass = (status: Debt["calculated_status"]) => {
    if (status === "paid") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }

    if (status === "partially_paid") {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }

    return "bg-red-50 text-red-700 border-red-200";
  };

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-50 text-slate-900"
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Link
                href="/"
                className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
              >
                الرئيسية
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-sm text-slate-700">الديون</span>
            </div>

            <h1 className="text-3xl font-black tracking-tight">
              إدارة الديون
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              تابع ما عليك وما لك، وسجّل عمليات السداد بدقة.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddDebt}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
          >
            <span className="text-lg">＋</span>
            تسجيل دين جديد
          </button>
        </header>

        {/* Messages */}
        {message && (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* Stats */}
        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-red-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500">
                إجمالي ما عليّ
              </span>
              <span className="rounded-xl bg-red-50 px-3 py-2 text-lg">
                ↙
              </span>
            </div>
            <p className="text-2xl font-black text-red-700">
              {formatMoney(totals.owedByMe)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              المبالغ المتبقية المستحقة عليّ
            </p>
          </div>

          <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500">
                إجمالي ما لي
              </span>
              <span className="rounded-xl bg-emerald-50 px-3 py-2 text-lg">
                ↗
              </span>
            </div>
            <p className="text-2xl font-black text-emerald-700">
              {formatMoney(totals.owedToMe)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              المبالغ المتبقية المستحقة لي
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500">
                الديون النشطة
              </span>
              <span className="rounded-xl bg-slate-100 px-3 py-2 text-lg">
                ◷
              </span>
            </div>
            <p className="text-2xl font-black">{totals.active}</p>
            <p className="mt-1 text-xs text-slate-400">
              من أصل {totals.total} دين
            </p>
          </div>
        </section>

        {/* Debt list */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black">قائمة الديون</h2>
                <p className="mt-1 text-xs text-slate-400">
                  جميع الديون المسجلة في النظام
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadDebts()}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                تحديث البيانات
              </button>
            </div>
          </div>

          {loading ? (
            <div className="px-6 py-16 text-center text-sm text-slate-500">
              جاري تحميل الديون...
            </div>
          ) : debts.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-2xl">
                💳
              </div>
              <h3 className="font-bold">لا توجد ديون مسجلة</h3>
              <p className="mt-2 text-sm text-slate-400">
                يمكنك تسجيل أول دين من الزر الموجود في أعلى الصفحة.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {debts.map((debt) => (
                <article
                  key={debt.id}
                  className="p-5 transition hover:bg-slate-50/70 sm:p-6"
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(
                            debt.calculated_status
                          )}`}
                        >
                          {statusLabel(debt.calculated_status)}
                        </span>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                          {debt.transaction_type === "work"
                            ? "مهني"
                            : "شخصي"}
                        </span>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                          {debt.debt_type === "owed_by_me"
                            ? "عليّ"
                            : "لي"}
                        </span>
                      </div>

                      <h3 className="truncate text-lg font-black">
                        {debt.party_name}
                      </h3>

                      {debt.description && (
                        <p className="mt-1 text-sm text-slate-500">
                          {debt.description}
                        </p>
                      )}

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <p className="text-xs text-slate-400">قيمة الدين</p>
                          <p className="mt-1 font-bold">
                            {formatMoney(Number(debt.original_amount))}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-400">المدفوع</p>
                          <p className="mt-1 font-bold text-emerald-600">
                            {formatMoney(Number(debt.paid_amount))}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-400">المتبقي</p>
                          <p className="mt-1 font-bold text-red-600">
                            {formatMoney(Number(debt.remaining_amount))}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-400">
                            الاستحقاق
                          </p>
                          <p className="mt-1 font-semibold">
                            {formatDate(debt.due_date)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:w-64 xl:justify-end">
                      {debt.calculated_status !== "paid" && (
                        <button
                          type="button"
                          onClick={() => {
                            void openPayments(debt);
                            setTimeout(() => {
                              setShowPaymentForm(true);
                              setPaymentAmount("");
                              setPaymentDate(today());
                              setPaymentMethod("نقدًا");
                              setPaymentNote("");
                            }, 0);
                          }}
                          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
                        >
                          تسجيل سداد
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => void openPayments(debt)}
                        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                      >
                        سجل الدفعات
                      </button>

                      <button
                        type="button"
                        onClick={() => void deleteDebt(debt)}
                        className="rounded-xl border border-red-100 px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Add debt modal */}
      {showDebtForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-xl font-black">تسجيل دين جديد</h2>
                <p className="mt-1 text-xs text-slate-400">
                  أدخل معلومات الدين بدقة
                </p>
              </div>

              <button
                type="button"
                onClick={closeDebtForm}
                className="rounded-xl px-3 py-2 text-xl text-slate-400 hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddDebt} className="space-y-5 p-6">
              <div>
                <label className="mb-2 block text-sm font-bold">
                  نوع الدين
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDebtType("owed_by_me")}
                    className={`rounded-2xl border p-4 text-right transition ${
                      debtType === "owed_by_me"
                        ? "border-red-300 bg-red-50 text-red-700"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-black">عليّ</div>
                    <div className="mt-1 text-xs opacity-70">
                      مبلغ أنا مدين به
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDebtType("owed_to_me")}
                    className={`rounded-2xl border p-4 text-right transition ${
                      debtType === "owed_to_me"
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-black">لي</div>
                    <div className="mt-1 text-xs opacity-70">
                      مبلغ مستحق لي
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  طبيعة العملية
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTransactionType("personal")}
                    className={`rounded-2xl border p-3 text-sm font-bold transition ${
                      transactionType === "personal"
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    شخصي
                  </button>

                  <button
                    type="button"
                    onClick={() => setTransactionType("work")}
                    className={`rounded-2xl border p-3 text-sm font-bold transition ${
                      transactionType === "work"
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    مهني
                  </button>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold">
                    الشخص / الجهة
                  </label>
                  <input
                    value={partyName}
                    onChange={(e) => setPartyName(e.target.value)}
                    placeholder="مثال: أحمد"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    مبلغ الدين
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={originalAmount}
                    onChange={(e) => setOriginalAmount(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  الوصف
                </label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="سبب الدين أو تفاصيله"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-500"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold">
                    تاريخ الدين
                  </label>
                  <input
                    type="date"
                    value={debtDate}
                    onChange={(e) => setDebtDate(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    تاريخ الاستحقاق
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  ملاحظات
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="ملاحظات إضافية..."
                  className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-2xl bg-slate-900 px-5 py-3 font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "جاري الحفظ..." : "حفظ الدين"}
                </button>

                <button
                  type="button"
                  onClick={closeDebtForm}
                  className="rounded-2xl border border-slate-200 px-5 py-3 font-bold text-slate-700"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payments modal */}
      {selectedDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black">
                    {selectedDebt.party_name}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {selectedDebt.debt_type === "owed_by_me"
                      ? "دين عليّ"
                      : "مبلغ لي"}
                    {" · "}
                    {selectedDebt.transaction_type === "work"
                      ? "مهني"
                      : "شخصي"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closePayments}
                  className="rounded-xl px-3 py-2 text-xl text-slate-400 hover:bg-slate-100"
                >
                  ×
                </button>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-400">الأصل</p>
                  <p className="mt-1 text-sm font-black">
                    {formatMoney(Number(selectedDebt.original_amount))}
                  </p>
                </div>

                <div className="rounded-2xl bg-emerald-50 p-3">
                  <p className="text-xs text-emerald-600">المدفوع</p>
                  <p className="mt-1 text-sm font-black text-emerald-700">
                    {formatMoney(Number(selectedDebt.paid_amount))}
                  </p>
                </div>

                <div className="rounded-2xl bg-red-50 p-3">
                  <p className="text-xs text-red-600">المتبقي</p>
                  <p className="mt-1 text-sm font-black text-red-700">
                    {formatMoney(Number(selectedDebt.remaining_amount))}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {!showPaymentForm &&
                selectedDebt.calculated_status !== "paid" && (
                  <button
                    type="button"
                    onClick={openPaymentForm}
                    className="mb-6 w-full rounded-2xl bg-slate-900 px-5 py-3 font-bold text-white transition hover:bg-slate-800"
                  >
                    ＋ تسجيل سداد جديد
                  </button>
                )}

              {showPaymentForm && (
                <form
                  onSubmit={handlePayment}
                  className="mb-6 rounded-3xl border border-slate-200 bg-slate-50 p-5"
                >
                  <h3 className="mb-4 font-black">تسجيل سداد</h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-bold">
                        مبلغ السداد
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={Number(selectedDebt.remaining_amount)}
                        step="0.01"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="0"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold">
                        تاريخ السداد
                      </label>
                      <input
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-bold">
                      طريقة الدفع
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500"
                    >
                      <option>نقدًا</option>
                      <option>تحويل بنكي</option>
                      <option>بريدي موب</option>
                      <option>CCP</option>
                      <option>أخرى</option>
                    </select>
                  </div>

                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-bold">
                      ملاحظة
                    </label>
                    <input
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                      placeholder="ملاحظة السداد..."
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500"
                    />
                  </div>

                  <div className="mt-4 flex gap-3">
                    <button
                      type="submit"
                      disabled={paymentSaving}
                      className="flex-1 rounded-2xl bg-slate-900 px-5 py-3 font-bold text-white disabled:opacity-50"
                    >
                      {paymentSaving ? "جاري التسجيل..." : "تأكيد السداد"}
                    </button>

                    <button
                      type="button"
                      disabled={paymentSaving}
                      onClick={() => setShowPaymentForm(false)}
                      className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              )}

              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-black">سجل الدفعات</h3>
                  <span className="text-xs text-slate-400">
                    {payments.length} عملية
                  </span>
                </div>

                {paymentsLoading ? (
                  <div className="py-8 text-center text-sm text-slate-400">
                    جاري تحميل سجل الدفعات...
                  </div>
                ) : payments.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                    لا توجد دفعات مسجلة لهذا الدين.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-black text-emerald-700">
                            {formatMoney(Number(payment.amount))}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {formatDate(payment.payment_date)}
                            {" · "}
                            {payment.payment_method || "بدون تحديد"}
                          </p>
                          {payment.note && (
                            <p className="mt-1 text-xs text-slate-500">
                              {payment.note}
                            </p>
                          )}
                        </div>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                          {payment.transaction_type === "work"
                            ? "مهني"
                            : "شخصي"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}