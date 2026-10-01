"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Mode = "login" | "forgot" | "verify";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("login");

  const [email, setEmail] = useState("esperrenceeloutaya@gmail.com");
  const [password, setPassword] = useState("");

  const [phone, setPhone] = useState("0655482029");
  const [otp, setOtp] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function resetMessages() {
    setError("");
    setMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    resetMessages();

    const { error: loginError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (loginError) {
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function sendOtp() {
    setLoading(true);
    resetMessages();

    // تحويل الرقم الجزائري إلى الصيغة الدولية
    const normalizedPhone = phone.trim().replace(/\s+/g, "");

    let internationalPhone = normalizedPhone;

    if (normalizedPhone.startsWith("0")) {
      internationalPhone = `+213${normalizedPhone.substring(1)}`;
    }

    if (!/^\+213[0-9]{9}$/.test(internationalPhone)) {
      setError("رقم الهاتف غير صحيح. أدخل رقمًا جزائريًا صحيحًا.");
      setLoading(false);
      return;
    }

    const { error: otpError } =
      await supabase.auth.signInWithOtp({
        phone: internationalPhone,
      });

    if (otpError) {
      setError(
        "تعذر إرسال رمز التحقق. تأكد من ربط رقم الهاتف بالحساب وتفعيل خدمة SMS في Supabase."
      );
      setLoading(false);
      return;
    }

    setMessage("تم إرسال رمز التحقق إلى هاتفك.");
    setMode("verify");
    setLoading(false);
  }

  async function verifyOtpAndChangePassword(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    resetMessages();

    if (otp.trim().length < 4) {
      setError("أدخل رمز التحقق الذي وصلك عبر SMS.");
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("كلمة المرور الجديدة يجب أن تحتوي على 6 أحرف على الأقل.");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين.");
      setLoading(false);
      return;
    }

    const normalizedPhone = phone.trim().replace(/\s+/g, "");

    let internationalPhone = normalizedPhone;

    if (normalizedPhone.startsWith("0")) {
      internationalPhone = `+213${normalizedPhone.substring(1)}`;
    }

    const { error: verifyError } =
      await supabase.auth.verifyOtp({
        phone: internationalPhone,
        token: otp.trim(),
        type: "sms",
      });

    if (verifyError) {
      setError("رمز التحقق غير صحيح أو انتهت صلاحيته.");
      setLoading(false);
      return;
    }

    const { error: passwordError } =
      await supabase.auth.updateUser({
        password: newPassword,
      });

    if (passwordError) {
      setError("تم التحقق من الهاتف، لكن تعذر تغيير كلمة المرور.");
      setLoading(false);
      return;
    }

    setMessage(
      "تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول."
    );

    setPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setOtp("");

    setMode("login");
    setLoading(false);
  }

  function openForgotPassword() {
    resetMessages();
    setMode("forgot");
  }

  function backToLogin() {
    resetMessages();
    setMode("login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm">

        {/* العنوان */}
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold text-blue-600">
            نظام التسيير المالي
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            {mode === "login"
              ? "تسجيل الدخول"
              : mode === "forgot"
              ? "استرجاع كلمة المرور"
              : "التحقق من الهاتف"}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {mode === "login"
              ? "ادخل إلى نظامك المالي الشخصي."
              : mode === "forgot"
              ? "سنرسل رمز تحقق إلى رقم هاتفك."
              : "أدخل الرمز الذي وصلك عبر رسالة SMS."}
          </p>
        </div>

        {/* تسجيل الدخول */}
        {mode === "login" && (
          <>
            <form onSubmit={handleSubmit} className="space-y-5">

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  البريد الإلكتروني
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  required
                  autoComplete="email"
                  placeholder="البريد الإلكتروني"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  كلمة المرور
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  required
                  autoComplete="current-password"
                  placeholder="كلمة المرور"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {message && (
                <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "جارٍ تسجيل الدخول..."
                  : "تسجيل الدخول"}
              </button>
            </form>

            <button
              type="button"
              onClick={openForgotPassword}
              className="mt-5 w-full text-center text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              نسيت كلمة المرور؟
            </button>
          </>
        )}

        {/* إرسال رمز الهاتف */}
        {mode === "forgot" && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendOtp();
            }}
            className="space-y-5"
          >
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                رقم الهاتف
              </label>

              <input
                type="tel"
                value={phone}
                onChange={(event) =>
                  setPhone(event.target.value)
                }
                required
                dir="ltr"
                placeholder="0655482029"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <p className="mt-2 text-xs text-slate-400">
                سيتم تحويل الرقم تلقائيًا إلى الصيغة الدولية +213.
              </p>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "جارٍ إرسال الرمز..."
                : "إرسال رمز التحقق"}
            </button>

            <button
              type="button"
              onClick={backToLogin}
              className="w-full text-sm font-medium text-slate-500 hover:text-blue-600"
            >
              العودة إلى تسجيل الدخول
            </button>
          </form>
        )}

        {/* التحقق وتغيير كلمة المرور */}
        {mode === "verify" && (
          <form
            onSubmit={verifyOtpAndChangePassword}
            className="space-y-5"
          >
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                رمز التحقق
              </label>

              <input
                type="text"
                value={otp}
                onChange={(event) =>
                  setOtp(event.target.value)
                }
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                dir="ltr"
                placeholder="123456"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-xl tracking-[0.4em] outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                كلمة المرور الجديدة
              </label>

              <input
                type="password"
                value={newPassword}
                onChange={(event) =>
                  setNewPassword(event.target.value)
                }
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="كلمة المرور الجديدة"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                تأكيد كلمة المرور
              </label>

              <input
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="أعد كتابة كلمة المرور"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "جارٍ تغيير كلمة المرور..."
                : "تغيير كلمة المرور"}
            </button>

            <button
              type="button"
              onClick={backToLogin}
              className="w-full text-sm font-medium text-slate-500 hover:text-blue-600"
            >
              العودة إلى تسجيل الدخول
            </button>
          </form>
        )}

        <Link
          href="/"
          className="mt-6 block text-center text-sm font-medium text-slate-500 hover:text-blue-600"
        >
          العودة إلى الرئيسية
        </Link>
      </div>
    </main>
  );
}