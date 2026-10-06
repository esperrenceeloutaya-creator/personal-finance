"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

/* =========================================================
   Types
========================================================= */

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
  is_active?: boolean;
};

type SupabaseError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

/* =========================================================
   Helpers
========================================================= */

function getLocalDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("ar-DZ", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  if (!value) return "-";

  const date = new Date(
    `${value}T00:00:00`
  );

  return new Intl.DateTimeFormat("ar-DZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function normalizeName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function getCategoryInsertErrorMessage(
  error: SupabaseError,
  isSubCategory: boolean
) {
  if (error.code === "23505") {
    if (isSubCategory) {
      return "هذا التصنيف الفرعي موجود مسبقًا تحت نفس التصنيف الرئيسي.";
    }

    return "هذا التصنيف الرئيسي موجود مسبقًا.";
  }

  return (
    error.message ||
    "تعذر إضافة التصنيف. حاول مرة أخرى."
  );
}

/* =========================================================
   Icons
========================================================= */

function WalletIcon({
  className = "h-5 w-5",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="15"
        rx="2.5"
      />
      <path d="M3 9h18" />
      <path d="M16 14h5" />
      <circle
        cx="16"
        cy="14"
        r="1"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

function ReceiptIcon({
  className = "h-5 w-5",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9 7h6" />
      <path d="M9 11h6" />
      <path d="M9 15h3" />
    </svg>
  );
}

function ChartIcon({
  className = "h-5 w-5",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 19V5" />
      <path d="M4 19h17" />
      <path d="m7 15 4-4 3 2 5-6" />
      <path d="M17 7h2v2" />
    </svg>
  );
}

function TrendingIcon({
  className = "h-5 w-5",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M3 17 9 11l4 4 7-8" />
      <path d="M15 7h5v5" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
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
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="m9 7 .7-2h4.6l.7 2" />
      <path d="M6 7l1 14h10l1-14" />
    </svg>
  );
}

function ExpenseIcon() {
  return (
    <svg
      className="h-8 w-8"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <rect
        x="4"
        y="3"
        width="16"
        height="18"
        rx="2"
      />
      <path d="M8 7h8" />
      <path d="M8 11h8" />
      <path d="M8 15h4" />
    </svg>
  );
}

/* =========================================================
   Page
========================================================= */

export default function ExpensesPage() {
  /* =======================================================
     State
  ======================================================= */

  const [loading, setLoading] =
    useState(true);

  const [userId, setUserId] =
    useState<string | null>(null);

  const [accountId, setAccountId] =
    useState<string | null>(null);

  const [expenses, setExpenses] =
    useState<Expense[]>([]);

  const [categories, setCategories] =
    useState<ExpenseCategory[]>([]);

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  /* Expense modal */

  const [showExpenseModal, setShowExpenseModal] =
    useState(false);

  const [editingExpense, setEditingExpense] =
    useState<Expense | null>(null);

  const [amount, setAmount] =
    useState("");

  const [date, setDate] =
    useState(getLocalDate());

  const [mainCategoryId, setMainCategoryId] =
    useState("");

  const [subCategoryId, setSubCategoryId] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [note, setNote] =
    useState("");

  /* Category modals */

  const [
    showMainCategoryModal,
    setShowMainCategoryModal,
  ] = useState(false);

  const [
    showSubCategoryModal,
    setShowSubCategoryModal,
  ] = useState(false);

  const [
    newMainCategoryName,
    setNewMainCategoryName,
  ] = useState("");

  const [
    newSubCategoryName,
    setNewSubCategoryName,
  ] = useState("");

  const [
    subCategoryParentId,
    setSubCategoryParentId,
  ] = useState("");

  const [
    savingMainCategory,
    setSavingMainCategory,
  ] = useState(false);

  const [
    savingSubCategory,
    setSavingSubCategory,
  ] = useState(false);

  /* Filters */

  const [search, setSearch] =
    useState("");

  const [
    filterMainCategoryId,
    setFilterMainCategoryId,
  ] = useState("");

  const [
    filterSubCategoryId,
    setFilterSubCategoryId,
  ] = useState("");

  const [
    filterDateFrom,
    setFilterDateFrom,
  ] = useState("");

  const [
    filterDateTo,
    setFilterDateTo,
  ] = useState("");

  /* =======================================================
     Categories
  ======================================================= */

  const mainCategories = useMemo(() => {
    return categories
      .filter(
        (category) =>
          !category.parent_id
      )
      .sort((a, b) =>
        a.name.localeCompare(
          b.name,
          "ar"
        )
      );
  }, [categories]);

  const formSubCategories =
    useMemo(() => {
      if (!mainCategoryId) return [];

      return categories
        .filter(
          (category) =>
            category.parent_id ===
            mainCategoryId
        )
        .sort((a, b) =>
          a.name.localeCompare(
            b.name,
            "ar"
          )
        );
    }, [
      categories,
      mainCategoryId,
    ]);

  const filterSubCategories =
    useMemo(() => {
      if (!filterMainCategoryId) {
        return [];
      }

      return categories
        .filter(
          (category) =>
            category.parent_id ===
            filterMainCategoryId
        )
        .sort((a, b) =>
          a.name.localeCompare(
            b.name,
            "ar"
          )
        );
    }, [
      categories,
      filterMainCategoryId,
    ]);

  const selectedMainCategory =
    useMemo(() => {
      return (
        mainCategories.find(
          (category) =>
            category.id ===
            mainCategoryId
        ) || null
      );
    }, [
      mainCategories,
      mainCategoryId,
    ]);

  /* =======================================================
     Filtered Expenses
  ======================================================= */

  const filteredExpenses =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return expenses.filter(
        (expense) => {
          const matchesSearch =
            !normalizedSearch ||
            [
              expense.description,
              expense.note,
              expense.category_name,
              expense.parent_category_name,
            ]
              .filter(Boolean)
              .some((value) =>
                String(value)
                  .toLowerCase()
                  .includes(
                    normalizedSearch
                  )
              );

          const matchesMain =
            !filterMainCategoryId ||
            expense.parent_category_id ===
              filterMainCategoryId ||
            expense.category_id ===
              filterMainCategoryId;

          const matchesSub =
            !filterSubCategoryId ||
            expense.category_id ===
              filterSubCategoryId;

          const matchesFrom =
            !filterDateFrom ||
            expense.expense_date >=
              filterDateFrom;

          const matchesTo =
            !filterDateTo ||
            expense.expense_date <=
              filterDateTo;

          return (
            matchesSearch &&
            matchesMain &&
            matchesSub &&
            matchesFrom &&
            matchesTo
          );
        }
      );
    }, [
      expenses,
      search,
      filterMainCategoryId,
      filterSubCategoryId,
      filterDateFrom,
      filterDateTo,
    ]);

  /* =======================================================
     Statistics
  ======================================================= */

  const totalExpenses = useMemo(
    () =>
      filteredExpenses.reduce(
        (sum, expense) =>
          sum + expense.amount,
        0
      ),
    [filteredExpenses]
  );

  const averageExpense =
    filteredExpenses.length
      ? totalExpenses /
        filteredExpenses.length
      : 0;

  const largestExpense =
    filteredExpenses.length
      ? Math.max(
          ...filteredExpenses.map(
            (expense) =>
              expense.amount
          )
        )
      : 0;

  const activeFilterCount =
    [
      search,
      filterMainCategoryId,
      filterSubCategoryId,
      filterDateFrom,
      filterDateTo,
    ].filter(Boolean).length;

  /* =======================================================
     Last 7 Days
  ======================================================= */

  const dailyStats = useMemo(() => {
    const days: {
      date: string;
      label: string;
      amount: number;
    }[] = [];

    const now = new Date();

    for (let index = 6; index >= 0; index--) {
      const current = new Date(now);

      current.setDate(
        now.getDate() - index
      );

      const year =
        current.getFullYear();

      const month = String(
        current.getMonth() + 1
      ).padStart(2, "0");

      const day = String(
        current.getDate()
      ).padStart(2, "0");

      const dateValue =
        `${year}-${month}-${day}`;

      const amount = expenses
        .filter(
          (expense) =>
            expense.expense_date ===
            dateValue
        )
        .reduce(
          (sum, expense) =>
            sum + expense.amount,
          0
        );

      days.push({
        date: dateValue,
        label: new Intl.DateTimeFormat(
          "ar-DZ",
          {
            weekday: "short",
          }
        ).format(current),
        amount,
      });
    }

    return days;
  }, [expenses]);

  const maxDailyExpense =
    Math.max(
      ...dailyStats.map(
        (day) => day.amount
      ),
      1
    );

  /* =======================================================
     Category Statistics
  ======================================================= */

  const categoryStats =
    useMemo(() => {
      const map =
        new Map<string, number>();

      filteredExpenses.forEach(
        (expense) => {
          const name =
            expense.category_name ||
            expense.parent_category_name ||
            "بدون تصنيف";

          map.set(
            name,
            (map.get(name) || 0) +
              expense.amount
          );
        }
      );

      return Array.from(
        map.entries()
      )
        .map(
          ([name, amount]) => ({
            name,
            amount,
          })
        )
        .sort(
          (a, b) =>
            b.amount - a.amount
        )
        .slice(0, 6);
    }, [filteredExpenses]);

  const maxCategoryExpense =
    Math.max(
      ...categoryStats.map(
        (item) => item.amount
      ),
      1
    );

  /* =======================================================
     Initialize
  ======================================================= */

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (
      filterSubCategoryId &&
      !filterSubCategories.some(
        (category) =>
          category.id ===
          filterSubCategoryId
      )
    ) {
      setFilterSubCategoryId("");
    }
  }, [
    filterSubCategories,
    filterSubCategoryId,
  ]);

  useEffect(() => {
    if (
      subCategoryId &&
      !formSubCategories.some(
        (category) =>
          category.id ===
          subCategoryId
      )
    ) {
      setSubCategoryId("");
    }
  }, [
    formSubCategories,
    subCategoryId,
  ]);

  /* =======================================================
     Loading
  ======================================================= */

  async function initialize() {
    try {
      setLoading(true);
      setError("");

      const {
        data: authData,
        error: authError,
      } =
        await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      const user =
        authData.user;

      if (!user) {
        setError(
          "المستخدم غير مسجل الدخول."
        );
        return;
      }

      setUserId(user.id);

      const loadedCategories =
        await loadCategories(
          user.id
        );

      await loadExpenses(
        user.id,
        loadedCategories
      );
    } catch (err) {
      console.error(err);

      setError(
        "النظام يتعذر عليه تحميل البيانات."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories(
    currentUserId: string
  ): Promise<ExpenseCategory[]> {
    const {
      data,
      error: categoryError,
    } = await supabase
      .from(
        "expense_categories"
      )
      .select(
        "id, name, parent_id, is_active"
      )
      .eq(
        "user_id",
        currentUserId
      )
      .eq(
        "is_active",
        true
      )
      .order("name", {
        ascending: true,
      });

    if (categoryError) {
      throw categoryError;
    }

    const loadedCategories =
      (data ||
        []) as ExpenseCategory[];

    setCategories(
      loadedCategories
    );

    return loadedCategories;
  }

  async function loadExpenses(
    currentUserId: string,
    loadedCategories: ExpenseCategory[] =
      categories
  ) {
    const {
      data,
      error: expenseError,
    } = await supabase
      .from("expenses")
      .select(
        `
          id,
          amount,
          expense_date,
          description,
          note,
          category_id,
          expense_categories (
            id,
            name,
            parent_id
          )
        `
      )
      .eq(
        "user_id",
        currentUserId
      )
      .order("expense_date", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      });

    if (expenseError) {
      throw expenseError;
    }

    const categoryMap =
      new Map<
        string,
        ExpenseCategory
      >(
        loadedCategories.map(
          (category) => [
            category.id,
            category,
          ]
        )
      );

    const formattedExpenses: Expense[] =
      ((data || []) as any[]).map(
        (item) => {
          const rawCategory =
            item.expense_categories;

          const category =
            Array.isArray(
              rawCategory
            )
              ? rawCategory[0]
              : rawCategory;

          const parent =
            category?.parent_id
              ? categoryMap.get(
                  category.parent_id
                )
              : undefined;

          return {
            id: item.id,
            amount: Number(
              item.amount || 0
            ),
            expense_date:
              item.expense_date,
            description:
              item.description ??
              null,
            note:
              item.note ?? null,
            category_id:
              item.category_id ??
              null,
            category_name:
              category?.name ??
              null,
            parent_category_id:
              category?.parent_id ??
              null,
            parent_category_name:
              parent?.name ??
              null,
          };
        }
      );

    setExpenses(
      formattedExpenses
    );
  }

  /* =======================================================
     Account
  ======================================================= */

  async function ensureAccount(
    currentUserId: string
  ) {
    if (accountId) {
      return accountId;
    }

    const {
      data: existingAccount,
      error: existingError,
    } = await supabase
      .from("accounts")
      .select("id")
      .eq(
        "user_id",
        currentUserId
      )
      .order("created_at", {
        ascending: true,
      })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existingAccount?.id) {
      setAccountId(
        existingAccount.id
      );

      return existingAccount.id;
    }

    const {
      data: newAccount,
      error: createError,
    } = await supabase
      .from("accounts")
      .insert({
        user_id: currentUserId,
        name: "الصندوق الرئيسي",
        currency: "دج",
      })
      .select("id")
      .single();

    if (createError) {
      throw createError;
    }

    setAccountId(
      newAccount.id
    );

    return newAccount.id;
  }

  /* =======================================================
     Expense Form
  ======================================================= */

  function resetExpenseForm() {
    setEditingExpense(null);
    setAmount("");
    setDate(getLocalDate());
    setMainCategoryId("");
    setSubCategoryId("");
    setDescription("");
    setNote("");
  }

  function openAddExpenseModal() {
    setMessage("");
    setError("");
    resetExpenseForm();
    setShowExpenseModal(true);
  }

  function openEditExpense(
    expense: Expense
  ) {
    setMessage("");
    setError("");

    const category =
      categories.find(
        (item) =>
          item.id ===
          expense.category_id
      );

    const mainId =
      category?.parent_id ||
      category?.id ||
      "";

    setEditingExpense(
      expense
    );

    setAmount(
      String(expense.amount)
    );

    setDate(
      expense.expense_date
    );

    setMainCategoryId(
      mainId
    );

    setSubCategoryId(
      category?.parent_id
        ? category.id
        : ""
    );

    setDescription(
      expense.description ||
        ""
    );

    setNote(
      expense.note || ""
    );

    setShowExpenseModal(
      true
    );
  }

  function closeExpenseModal() {
    if (saving) return;

    setShowExpenseModal(
      false
    );

    resetExpenseForm();
  }

  async function handleExpenseSubmit(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!userId) {
      setError(
        "المستخدم غير مسجل الدخول."
      );
      return;
    }

    const numericAmount =
      Number(amount);

    if (
      !amount ||
      !Number.isFinite(
        numericAmount
      )
    ) {
      setError(
        "أدخل مبلغ المصروف."
      );
      return;
    }

    if (numericAmount <= 0) {
      setError(
        "يجب أن يكون مبلغ المصروف أكبر من صفر."
      );
      return;
    }

    if (!date) {
      setError(
        "اختر تاريخ المصروف."
      );
      return;
    }

    const categoryId =
      subCategoryId ||
      mainCategoryId;

    if (!categoryId) {
      setError(
        "اختر تصنيف المصروف."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const currentAccountId =
        await ensureAccount(
          userId
        );

      const payload = {
        user_id: userId,
        account_id:
          currentAccountId,
        amount:
          numericAmount,
        expense_date:
          date,
        category_id:
          categoryId,
        description:
          description.trim() ||
          null,
        note:
          note.trim() ||
          null,
      };

      if (editingExpense) {
        const {
          error: updateError,
        } = await supabase
          .from("expenses")
          .update(payload)
          .eq(
            "id",
            editingExpense.id
          )
          .eq(
            "user_id",
            userId
          );

        if (updateError) {
          throw updateError;
        }

        setMessage(
          "تم تعديل المصروف بنجاح."
        );
      } else {
        const {
          error: insertError,
        } = await supabase
          .from("expenses")
          .insert(payload);

        if (insertError) {
          throw insertError;
        }

        setMessage(
          "تم تسجيل المصروف بنجاح."
        );
      }

      setShowExpenseModal(
        false
      );

      resetExpenseForm();

      const loadedCategories =
        await loadCategories(
          userId
        );

      await loadExpenses(
        userId,
        loadedCategories
      );
    } catch (err) {
      console.error(err);

      const supabaseError =
        err as SupabaseError;

      if (
        supabaseError.code ===
        "23505"
      ) {
        setError(
          "حدث تعارض أثناء الحفظ. تأكد من البيانات وحاول مرة أخرى."
        );
      } else {
        setError(
          editingExpense
            ? "تعذر تعديل المصروف. حاول مرة أخرى."
            : "تعذر تسجيل المصروف. حاول مرة أخرى."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     Delete
  ======================================================= */

  async function handleDeleteExpense(
    expenseId: string
  ) {
    if (!userId) return;

    const confirmed =
      window.confirm(
        "هل أنت متأكد من حذف هذا المصروف؟ لا يمكن التراجع عن هذه العملية."
      );

    if (!confirmed) return;

    try {
      setDeletingId(
        expenseId
      );

      setError("");
      setMessage("");

      const {
        error: deleteError,
      } = await supabase
        .from("expenses")
        .delete()
        .eq(
          "id",
          expenseId
        )
        .eq(
          "user_id",
          userId
        );

      if (deleteError) {
        throw deleteError;
      }

      setExpenses(
        (current) =>
          current.filter(
            (expense) =>
              expense.id !==
              expenseId
          )
      );

      setMessage(
        "تم حذف المصروف بنجاح."
      );
    } catch (err) {
      console.error(err);

      setError(
        "تعذر حذف المصروف. حاول مرة أخرى."
      );
    } finally {
      setDeletingId(null);
    }
  }

  /* =======================================================
     Categories
  ======================================================= */

  async function handleAddMainCategory(
    event: FormEvent
  ) {
    event.preventDefault();

    const name =
      newMainCategoryName.trim();

    if (!name) {
      setError(
        "أدخل اسم التصنيف الرئيسي."
      );
      return;
    }

    if (!userId) {
      setError(
        "المستخدم غير مسجل الدخول."
      );
      return;
    }

    const normalizedName =
      normalizeName(name);

    const alreadyExists =
      categories.some(
        (category) =>
          !category.parent_id &&
          normalizeName(
            category.name
          ) ===
            normalizedName
      );

    if (alreadyExists) {
      setError(
        "هذا التصنيف الرئيسي موجود مسبقًا. اختر اسمًا آخر."
      );
      return;
    }

    try {
      setSavingMainCategory(
        true
      );

      setError("");
      setMessage("");

      const {
        data,
        error: insertError,
      } = await supabase
        .from(
          "expense_categories"
        )
        .insert({
          user_id: userId,
          name,
          parent_id: null,
          is_active: true,
        })
        .select(
          "id, name, parent_id, is_active"
        )
        .single();

      if (insertError) {
        throw insertError;
      }

      setCategories(
        (current) =>
          [
            ...current,
            data as ExpenseCategory,
          ].sort((a, b) =>
            a.name.localeCompare(
              b.name,
              "ar"
            )
          )
      );

      setMainCategoryId(
        data.id
      );

      setSubCategoryId("");

      setShowMainCategoryModal(
        false
      );

      setNewMainCategoryName(
        ""
      );

      setMessage(
        "تمت إضافة التصنيف الرئيسي بنجاح."
      );
    } catch (err) {
      console.error(err);

      setError(
        getCategoryInsertErrorMessage(
          err as SupabaseError,
          false
        )
      );
    } finally {
      setSavingMainCategory(
        false
      );
    }
  }

  async function handleAddSubCategory(
    event: FormEvent
  ) {
    event.preventDefault();

    const name =
      newSubCategoryName.trim();

    if (!name) {
      setError(
        "أدخل اسم التصنيف الفرعي."
      );
      return;
    }

    if (!subCategoryParentId) {
      setError(
        "اختر التصنيف الرئيسي أولاً."
      );
      return;
    }

    if (!userId) {
      setError(
        "المستخدم غير مسجل الدخول."
      );
      return;
    }

    const normalizedName =
      normalizeName(name);

    const alreadyExists =
      categories.some(
        (category) =>
          category.parent_id ===
            subCategoryParentId &&
          normalizeName(
            category.name
          ) ===
            normalizedName
      );

    if (alreadyExists) {
      setError(
        "هذا التصنيف الفرعي موجود مسبقًا تحت نفس التصنيف الرئيسي."
      );
      return;
    }

    try {
      setSavingSubCategory(
        true
      );

      setError("");
      setMessage("");

      const {
        data,
        error: insertError,
      } = await supabase
        .from(
          "expense_categories"
        )
        .insert({
          user_id: userId,
          name,
          parent_id:
            subCategoryParentId,
          is_active: true,
        })
        .select(
          "id, name, parent_id, is_active"
        )
        .single();

      if (insertError) {
        throw insertError;
      }

      setCategories(
        (current) =>
          [
            ...current,
            data as ExpenseCategory,
          ].sort((a, b) =>
            a.name.localeCompare(
              b.name,
              "ar"
            )
          )
      );

      setMainCategoryId(
        subCategoryParentId
      );

      setSubCategoryId(
        data.id
      );

      setShowSubCategoryModal(
        false
      );

      setNewSubCategoryName(
        ""
      );

      setMessage(
        "تمت إضافة التصنيف الفرعي بنجاح."
      );
    } catch (err) {
      console.error(err);

      setError(
        getCategoryInsertErrorMessage(
          err as SupabaseError,
          true
        )
      );
    } finally {
      setSavingSubCategory(
        false
      );
    }
  }

  /* =======================================================
     Filters
  ======================================================= */

  function resetFilters() {
    setSearch("");
    setFilterMainCategoryId("");
    setFilterSubCategoryId("");
    setFilterDateFrom("");
    setFilterDateTo("");
  }

  function openMainCategoryModal() {
    setError("");
    setMessage("");
    setNewMainCategoryName(
      ""
    );
    setShowMainCategoryModal(
      true
    );
  }

  function openSubCategoryModal() {
    setError("");
    setMessage("");
    setNewSubCategoryName(
      ""
    );

    setSubCategoryParentId(
      mainCategoryId || ""
    );

    setShowSubCategoryModal(
      true
    );
  }

  /* =======================================================
     Loading UI
  ======================================================= */

  if (loading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-[#f5f7fb] px-4 py-8 text-slate-900"
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex min-h-[70vh] items-center justify-center">
            <div className="w-full max-w-sm rounded-[2rem] bg-white p-10 text-center shadow-xl shadow-slate-200/50 ring-1 ring-slate-200">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <WalletIcon className="h-7 w-7" />
              </div>

              <div className="mx-auto mb-5 h-9 w-9 animate-spin rounded-full border-[3px] border-slate-200 border-t-slate-900" />

              <h2 className="font-black text-slate-900">
                إدارة المصاريف
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                جاري تحميل بياناتك المالية...
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#f5f7fb] text-slate-900"
    >
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-7">

        {/* HERO */}

        <header className="relative mb-6 overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl shadow-slate-300/30 sm:p-8">
          <div className="absolute -left-20 -top-20 h-56 w-56 rounded-full bg-white/5 blur-2xl" />
          <div className="absolute -bottom-28 right-20 h-64 w-64 rounded-full bg-white/[0.04] blur-3xl" />

          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-4 flex items-center gap-2 text-xs">
                <Link
                  href="/"
                  className="font-semibold text-slate-400 transition hover:text-white"
                >
                  الرئيسية
                </Link>

                <span className="text-slate-600">
                  /
                </span>

                <span className="font-bold text-slate-200">
                  المصاريف
                </span>
              </div>

              <div className="flex items-start gap-4">
                <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/10 sm:flex">
                  <ReceiptIcon className="h-7 w-7" />
                </div>

                <div>
                  <h1 className="text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
                    إدارة المصاريف
                  </h1>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                    تحكم كامل في مصاريفك اليومية، تصنيفاتك، وتحليلات الإنفاق في مكان واحد.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/incomes"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-slate-200 backdrop-blur transition hover:bg-white/10"
              >
                المداخيل
              </Link>

              <button
                type="button"
                onClick={
                  openAddExpenseModal
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-black/20 transition hover:bg-slate-100"
              >
                <PlusIcon />
                تسجيل مصروف
              </button>
            </div>
          </div>

          <div className="relative mt-7 grid grid-cols-2 gap-3 border-t border-white/10 pt-5 sm:grid-cols-4">
            <div>
              <p className="text-[11px] font-bold text-slate-500">
                العمليات
              </p>

              <p className="mt-1 text-lg font-black">
                {formatMoney(
                  filteredExpenses.length
                )}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-bold text-slate-500">
                إجمالي الإنفاق
              </p>

              <p className="mt-1 text-lg font-black">
                {formatMoney(
                  totalExpenses
                )}

                <span className="mr-1 text-xs text-slate-500">
                  دج
                </span>
              </p>
            </div>

            <div>
              <p className="text-[11px] font-bold text-slate-500">
                المتوسط
              </p>

              <p className="mt-1 text-lg font-black">
                {formatMoney(
                  averageExpense
                )}

                <span className="mr-1 text-xs text-slate-500">
                  دج
                </span>
              </p>
            </div>

            <div>
              <p className="text-[11px] font-bold text-slate-500">
                التصنيفات
              </p>

              <p className="mt-1 text-lg font-black">
                {formatMoney(
                  mainCategories.length
                )}
              </p>
            </div>
          </div>
        </header>

        {/* MESSAGES */}

        {(message || error) && (
          <div className="mb-6 space-y-2">
            {message && (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm font-bold text-emerald-700 shadow-sm">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100">
                  ✓
                </div>

                <span>{message}</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm font-bold text-red-700 shadow-sm">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100">
                  !
                </div>

                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* STATISTICS */}

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: "إجمالي المصاريف",
              value: totalExpenses,
              suffix: "دج",
              description:
                "حسب الفلاتر الحالية",
              icon: (
                <WalletIcon />
              ),
              dark: true,
            },
            {
              title: "عدد العمليات",
              value:
                filteredExpenses.length,
              suffix: "",
              description:
                "عملية مسجلة",
              icon: (
                <ReceiptIcon />
              ),
            },
            {
              title: "متوسط المصروف",
              value:
                averageExpense,
              suffix: "دج",
              description:
                "متوسط قيمة العملية",
              icon: (
                <ChartIcon />
              ),
            },
            {
              title: "أكبر مصروف",
              value:
                largestExpense,
              suffix: "دج",
              description:
                "أعلى عملية مسجلة",
              icon: (
                <TrendingIcon />
              ),
            },
          ].map((stat) => (
            <div
              key={stat.title}
              className="group rounded-[1.6rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/50"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500">
                    {stat.title}
                  </p>

                  <p className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                    {formatMoney(
                      stat.value
                    )}

                    {stat.suffix && (
                      <span className="mr-1 text-xs font-bold text-slate-400">
                        {stat.suffix}
                      </span>
                    )}
                  </p>

                  <p className="mt-2 text-[11px] font-semibold text-slate-400">
                    {stat.description}
                  </p>
                </div>

                <div
                  className={
                    stat.dark
                      ? "rounded-2xl bg-slate-950 p-3 text-white shadow-lg shadow-slate-300"
                      : "rounded-2xl bg-slate-100 p-3 text-slate-700"
                  }
                >
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* ANALYTICS */}

        <section className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/80 sm:p-6">
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                    <ChartIcon className="h-5 w-5" />
                  </div>

                  <h2 className="font-black text-slate-950">
                    الإنفاق خلال آخر 7 أيام
                  </h2>
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  متابعة سريعة لحركة المصاريف اليومية.
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-black text-slate-500">
                7 أيام
              </span>
            </div>

            <div className="flex h-56 items-end justify-between gap-2 border-b border-slate-100 pb-3">
              {dailyStats.map(
                (day) => {
                  const height =
                    day.amount === 0
                      ? 3
                      : Math.max(
                          8,
                          (day.amount /
                            maxDailyExpense) *
                            100
                        );

                  return (
                    <div
                      key={day.date}
                      className="group flex h-full flex-1 flex-col items-center justify-end gap-2"
                    >
                      <div className="relative flex h-full w-full items-end justify-center">
                        {day.amount >
                          0 && (
                          <span className="absolute bottom-[calc(var(--bar-height)+8px)] hidden whitespace-nowrap rounded-lg bg-slate-950 px-2 py-1 text-[10px] font-bold text-white shadow-lg group-hover:block">
                            {formatMoney(
                              day.amount
                            )}{" "}
                            دج
                          </span>
                        )}

                        <div
                          className="w-full max-w-10 rounded-t-xl bg-slate-900 transition-all duration-500 group-hover:bg-slate-700"
                          style={
                            {
                              height: `${height}%`,
                              "--bar-height": `${height}%`,
                            } as React.CSSProperties
                          }
                        />
                      </div>

                      <span className="text-[10px] font-bold text-slate-400 sm:text-[11px]">
                        {day.label}
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          <div className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/80 sm:p-6">
            <div className="mb-7">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                  <TrendingIcon className="h-5 w-5" />
                </div>

                <h2 className="font-black text-slate-950">
                  توزيع المصاريف
                </h2>
              </div>

              <p className="mt-2 text-xs text-slate-500">
                التصنيفات الأكثر استهلاكًا من المصاريف الحالية.
              </p>
            </div>

            {categoryStats.length ===
            0 ? (
              <div className="flex h-44 items-center justify-center rounded-2xl bg-slate-50 text-sm font-bold text-slate-400">
                لا توجد بيانات كافية للعرض.
              </div>
            ) : (
              <div className="space-y-5">
                {categoryStats.map(
                  (
                    item,
                    index
                  ) => {
                    const width =
                      (item.amount /
                        maxCategoryExpense) *
                      100;

                    const percentage =
                      totalExpenses >
                      0
                        ? (item.amount /
                            totalExpenses) *
                          100
                        : 0;

                    return (
                      <div
                        key={
                          item.name
                        }
                      >
                        <div className="mb-2.5 flex items-center justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-black text-slate-500">
                              {index +
                                1}
                            </span>

                            <span className="truncate text-sm font-bold text-slate-700">
                              {
                                item.name
                              }
                            </span>
                          </div>

                          <div className="shrink-0 text-left">
                            <span className="text-xs font-black text-slate-600">
                              {formatMoney(
                                item.amount
                              )}{" "}
                              دج
                            </span>

                            <span className="mr-2 text-[10px] font-bold text-slate-400">
                              {percentage.toFixed(
                                0
                              )}
                              %
                            </span>
                          </div>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-slate-900 transition-all duration-500"
                            style={{
                              width: `${width}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </section>

        {/* FILTERS */}

        <section className="mb-6 rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/80 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                  <FilterIcon />
                </div>

                <h2 className="font-black text-slate-950">
                  البحث والتصفية
                </h2>

                {activeFilterCount >
                  0 && (
                  <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-black text-white">
                    {
                      activeFilterCount
                    }
                  </span>
                )}
              </div>

              <p className="mt-2 text-xs text-slate-500">
                ابحث أو استخدم التصنيفات والتاريخ للوصول إلى العمليات المطلوبة.
              </p>
            </div>

            <button
              type="button"
              onClick={
                resetFilters
              }
              className="self-start rounded-lg px-2 py-1 text-xs font-black text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
            >
              إعادة ضبط الفلاتر
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                <SearchIcon />
              </div>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
                placeholder="بحث في المصاريف..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-10 pl-3 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
              />
            </div>

            <select
              value={
                filterMainCategoryId
              }
              onChange={(event) =>
                setFilterMainCategoryId(
                  event.target
                    .value
                )
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
            >
              <option value="">
                كل التصنيفات الرئيسية
              </option>

              {mainCategories.map(
                (category) => (
                  <option
                    key={
                      category.id
                    }
                    value={
                      category.id
                    }
                  >
                    {category.name}
                  </option>
                )
              )}
            </select>

            <select
              value={
                filterSubCategoryId
              }
              onChange={(event) =>
                setFilterSubCategoryId(
                  event.target
                    .value
                )
              }
              disabled={
                !filterMainCategoryId
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">
                كل التصنيفات الفرعية
              </option>

              {filterSubCategories.map(
                (category) => (
                  <option
                    key={
                      category.id
                    }
                    value={
                      category.id
                    }
                  >
                    {category.name}
                  </option>
                )
              )}
            </select>

            <input
              type="date"
              value={
                filterDateFrom
              }
              onChange={(event) =>
                setFilterDateFrom(
                  event.target
                    .value
                )
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
            />

            <input
              type="date"
              value={
                filterDateTo
              }
              onChange={(event) =>
                setFilterDateTo(
                  event.target
                    .value
                )
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
            />
          </div>
        </section>

        {/* EXPENSE LIST */}

        <section className="overflow-hidden rounded-[1.8rem] bg-white shadow-sm ring-1 ring-slate-200/80">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="font-black text-slate-950">
                  المصاريف المسجلة
                </h2>

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500">
                  {formatMoney(
                    filteredExpenses.length
                  )}{" "}
                  عملية
                </span>
              </div>

              <p className="mt-2 text-xs text-slate-500">
                جميع العمليات المطابقة للبحث والفلاتر الحالية.
              </p>
            </div>

            <button
              type="button"
              onClick={
                openAddExpenseModal
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-lg shadow-slate-200 transition hover:bg-slate-800"
            >
              <PlusIcon />
              مصروف جديد
            </button>
          </div>

          {filteredExpenses.length ===
          0 ? (
            <div className="px-5 py-20 text-center sm:px-10">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[1.7rem] bg-slate-100 text-slate-400">
                <ExpenseIcon />
              </div>

              <h3 className="text-lg font-black text-slate-800">
                لا توجد مصاريف
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                لا توجد عمليات مطابقة للبحث أو الفلاتر الحالية. يمكنك تسجيل مصروف جديد للبدء.
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {activeFilterCount >
                  0 && (
                  <button
                    type="button"
                    onClick={
                      resetFilters
                    }
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                  >
                    إزالة الفلاتر
                  </button>
                )}

                <button
                  type="button"
                  onClick={
                    openAddExpenseModal
                  }
                  className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-black text-white transition hover:bg-slate-800"
                >
                  تسجيل أول مصروف
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop */}

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[900px] text-right">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] text-slate-500">
                      <th className="px-6 py-4 font-black">
                        التاريخ
                      </th>

                      <th className="px-6 py-4 font-black">
                        التصنيف
                      </th>

                      <th className="px-6 py-4 font-black">
                        البيان
                      </th>

                      <th className="px-6 py-4 font-black">
                        المبلغ
                      </th>

                      <th className="px-6 py-4 text-left font-black">
                        الإجراءات
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredExpenses.map(
                      (expense) => (
                        <tr
                          key={
                            expense.id
                          }
                          className="group border-b border-slate-100 transition hover:bg-slate-50/80"
                        >
                          <td className="px-6 py-5">
                            <span className="text-sm font-bold text-slate-600">
                              {formatDate(
                                expense.expense_date
                              )}
                            </span>
                          </td>

                          <td className="px-6 py-5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {expense.parent_category_name && (
                                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                                  {
                                    expense.parent_category_name
                                  }
                                </span>
                              )}

                              {expense.category_name && (
                                <span className="rounded-lg bg-slate-950 px-2.5 py-1 text-[11px] font-bold text-white">
                                  {
                                    expense.category_name
                                  }
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-6 py-5">
                            <div className="max-w-xs">
                              <p className="truncate text-sm font-black text-slate-800">
                                {expense.description ||
                                  "بدون بيان"}
                              </p>

                              {expense.note && (
                                <p className="mt-1 truncate text-xs text-slate-400">
                                  {
                                    expense.note
                                  }
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="px-6 py-5">
                            <span className="text-base font-black text-slate-950">
                              {formatMoney(
                                expense.amount
                              )}
                            </span>

                            <span className="mr-1 text-[11px] font-bold text-slate-400">
                              دج
                            </span>
                          </td>

                          <td className="px-6 py-5">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  openEditExpense(
                                    expense
                                  )
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                              >
                                <EditIcon />
                                تعديل
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteExpense(
                                    expense.id
                                  )
                                }
                                disabled={
                                  deletingId ===
                                  expense.id
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 bg-white px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <TrashIcon />

                                {deletingId ===
                                expense.id
                                  ? "جارٍ..."
                                  : "حذف"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}

              <div className="space-y-3 p-4 md:hidden">
                {filteredExpenses.map(
                  (expense) => (
                    <div
                      key={
                        expense.id
                      }
                      className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-slate-400">
                            {formatDate(
                              expense.expense_date
                            )}
                          </p>

                          <p className="mt-2 truncate font-black text-slate-900">
                            {expense.description ||
                              "بدون بيان"}
                          </p>
                        </div>

                        <div className="shrink-0 text-left">
                          <p className="font-black text-slate-950">
                            {formatMoney(
                              expense.amount
                            )}
                          </p>

                          <p className="text-[10px] font-bold text-slate-400">
                            دج
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {expense.parent_category_name && (
                          <span className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200">
                            {
                              expense.parent_category_name
                            }
                          </span>
                        )}

                        {expense.category_name && (
                          <span className="rounded-lg bg-slate-950 px-2.5 py-1 text-[11px] font-bold text-white">
                            {
                              expense.category_name
                            }
                          </span>
                        )}
                      </div>

                      {expense.note && (
                        <p className="mt-3 rounded-xl bg-white p-3 text-xs leading-5 text-slate-500 ring-1 ring-slate-100">
                          {
                            expense.note
                          }
                        </p>
                      )}

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openEditExpense(
                              expense
                            )
                          }
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700"
                        >
                          <EditIcon />
                          تعديل
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteExpense(
                              expense.id
                            )
                          }
                          disabled={
                            deletingId ===
                            expense.id
                          }
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-100 bg-white py-2.5 text-xs font-bold text-red-600 disabled:opacity-50"
                        >
                          <TrashIcon />

                          {deletingId ===
                          expense.id
                            ? "جارٍ الحذف..."
                            : "حذف"}
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {/* =====================================================
          EXPENSE MODAL
      ===================================================== */}

      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md">
          <div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 p-5 backdrop-blur sm:p-6">
              <div>
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-slate-950 p-2.5 text-white">
                    <ReceiptIcon className="h-5 w-5" />
                  </div>

                  <h2 className="text-lg font-black text-slate-950">
                    {editingExpense
                      ? "تعديل المصروف"
                      : "تسجيل مصروف جديد"}
                  </h2>
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  أدخل بيانات المصروف بدقة ليظهر في التقارير.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeExpenseModal
                }
                disabled={saving}
                className="rounded-xl p-2.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
              >
                <CloseIcon />
              </button>
            </div>

            <form
              onSubmit={
                handleExpenseSubmit
              }
              className="space-y-5 p-5 sm:p-6"
            >
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-black text-slate-700">
                    المبلغ
                  </label>

                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={amount}
                      onChange={(event) =>
                        setAmount(
                          event.target
                            .value
                        )
                      }
                      placeholder="مثال: 3000"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 pl-14 text-sm font-black outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                    />

                    <span className="absolute inset-y-0 left-4 flex items-center text-xs font-black text-slate-400">
                      دج
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-700">
                    التاريخ
                  </label>

                  <input
                    type="date"
                    value={date}
                    onChange={(event) =>
                      setDate(
                        event.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 sm:p-5">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-800">
                      تصنيف المصروف
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      اختر الرئيسي ثم الفرعي عند الحاجة.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={
                        openMainCategoryModal
                      }
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-100"
                    >
                      + رئيسي
                    </button>

                    <button
                      type="button"
                      onClick={
                        openSubCategoryModal
                      }
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-100"
                    >
                      + فرعي
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-black text-slate-600">
                      التصنيف الرئيسي
                    </label>

                    <select
                      value={
                        mainCategoryId
                      }
                      onChange={(event) =>
                        setMainCategoryId(
                          event.target
                            .value
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3.5 text-sm font-bold outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    >
                      <option value="">
                        اختر التصنيف الرئيسي
                      </option>

                      {mainCategories.map(
                        (category) => (
                          <option
                            key={
                              category.id
                            }
                            value={
                              category.id
                            }
                          >
                            {
                              category.name
                            }
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-black text-slate-600">
                      التصنيف الفرعي
                    </label>

                    <select
                      value={
                        subCategoryId
                      }
                      onChange={(event) =>
                        setSubCategoryId(
                          event.target
                            .value
                        )
                      }
                      disabled={
                        !mainCategoryId ||
                        formSubCategories.length ===
                          0
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3.5 text-sm font-bold outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value="">
                        {mainCategoryId
                          ? formSubCategories.length
                            ? "بدون تصنيف فرعي"
                            : "لا توجد تصنيفات فرعية"
                          : "اختر الرئيسي أولاً"}
                      </option>

                      {formSubCategories.map(
                        (category) => (
                          <option
                            key={
                              category.id
                            }
                            value={
                              category.id
                            }
                          >
                            {
                              category.name
                            }
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                {selectedMainCategory && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl bg-white px-3 py-3 text-xs text-slate-500 ring-1 ring-slate-100">
                    <span className="h-2 w-2 rounded-full bg-slate-900" />

                    التصنيف المختار:

                    <span className="font-black text-slate-800">
                      {subCategoryId
                        ? formSubCategories.find(
                            (item) =>
                              item.id ===
                              subCategoryId
                          )?.name ||
                          selectedMainCategory.name
                        : selectedMainCategory.name}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  البيان
                </label>

                <input
                  type="text"
                  value={
                    description
                  }
                  onChange={(event) =>
                    setDescription(
                      event.target
                        .value
                    )
                  }
                  placeholder="مثال: شراء مواد غذائية"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  ملاحظة
                </label>

                <textarea
                  value={note}
                  onChange={(event) =>
                    setNote(
                      event.target
                        .value
                    )
                  }
                  rows={3}
                  placeholder="ملاحظات إضافية اختيارية..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row">
                <button
                  type="button"
                  onClick={
                    closeExpenseModal
                  }
                  disabled={saving}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-slate-950 px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "جارٍ الحفظ..."
                    : editingExpense
                    ? "حفظ التعديلات"
                    : "حفظ المصروف"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          MAIN CATEGORY MODAL
      ===================================================== */}

      {showMainCategoryModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md">
          <div className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6">
              <div>
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-slate-950 p-2.5 text-white">
                    <PlusIcon />
                  </div>

                  <h2 className="font-black text-slate-950">
                    إضافة تصنيف رئيسي
                  </h2>
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  مثال: مواد غذائية، سكن، صحة...
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowMainCategoryModal(
                    false
                  )
                }
                disabled={
                  savingMainCategory
                }
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <CloseIcon />
              </button>
            </div>

            <form
              onSubmit={
                handleAddMainCategory
              }
              className="space-y-5 p-5 sm:p-6"
            >
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  اسم التصنيف
                </label>

                <input
                  autoFocus
                  type="text"
                  value={
                    newMainCategoryName
                  }
                  onChange={(event) =>
                    setNewMainCategoryName(
                      event.target
                        .value
                    )
                  }
                  placeholder="مثال: مواد غذائية"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <div className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                سيتم إنشاء التصنيف الرئيسي ليظهر مباشرة في قائمة المصاريف.
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setShowMainCategoryModal(
                      false
                    )
                  }
                  disabled={
                    savingMainCategory
                  }
                  className="flex-1 rounded-xl border border-slate-200 py-3.5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={
                    savingMainCategory
                  }
                  className="flex-1 rounded-xl bg-slate-950 py-3.5 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {savingMainCategory
                    ? "جارٍ الإضافة..."
                    : "إضافة التصنيف"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          SUB CATEGORY MODAL
      ===================================================== */}

      {showSubCategoryModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md">
          <div className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6">
              <div>
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-slate-950 p-2.5 text-white">
                    <PlusIcon />
                  </div>

                  <h2 className="font-black text-slate-950">
                    إضافة تصنيف فرعي
                  </h2>
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  مثال: مواد غذائية ← حليب
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowSubCategoryModal(
                    false
                  )
                }
                disabled={
                  savingSubCategory
                }
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <CloseIcon />
              </button>
            </div>

            <form
              onSubmit={
                handleAddSubCategory
              }
              className="space-y-5 p-5 sm:p-6"
            >
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  التصنيف الرئيسي
                </label>

                <select
                  value={
                    subCategoryParentId
                  }
                  onChange={(event) =>
                    setSubCategoryParentId(
                      event.target
                        .value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3.5 text-sm font-bold outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                >
                  <option value="">
                    اختر التصنيف الرئيسي
                  </option>

                  {mainCategories.map(
                    (category) => (
                      <option
                        key={
                          category.id
                        }
                        value={
                          category.id
                        }
                      >
                        {
                          category.name
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  اسم التصنيف الفرعي
                </label>

                <input
                  autoFocus
                  type="text"
                  value={
                    newSubCategoryName
                  }
                  onChange={(event) =>
                    setNewSubCategoryName(
                      event.target
                        .value
                    )
                  }
                  placeholder="مثال: حليب"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs leading-6 text-slate-500">
                يمكن استخدام نفس اسم التصنيف الفرعي تحت تصنيف رئيسي مختلف، مثل:

                <div className="mt-2 space-y-1">
                  <p className="font-black text-slate-700">
                    مواد غذائية ← قهوة
                  </p>

                  <p className="font-black text-slate-700">
                    ضيافة ← قهوة
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setShowSubCategoryModal(
                      false
                    )
                  }
                  disabled={
                    savingSubCategory
                  }
                  className="flex-1 rounded-xl border border-slate-200 py-3.5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={
                    savingSubCategory
                  }
                  className="flex-1 rounded-xl bg-slate-950 py-3.5 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {savingSubCategory
                    ? "جارٍ الإضافة..."
                    : "إضافة التصنيف"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}