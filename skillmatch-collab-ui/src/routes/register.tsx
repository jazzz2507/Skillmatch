import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/components/AuthLayout";
import { TextField } from "@/components/FormField";
import { authService } from "@/services";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create your account — SkillMatch" },
      {
        name: "description",
        content: "Create a SkillMatch profile, list your technical skills and get matched to student projects.",
      },
      { property: "og:title", content: "Create your account — SkillMatch" },
      { property: "og:description", content: "Join SkillMatch and find your next project team." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const next: Record<string, string> = {};
    if (form.fullName.trim().length < 3) next["fullName"] = "Enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next["email"] = "Enter a valid email address.";
    if (form.password.length < 6) next["password"] = "Use at least 6 characters.";
    if (form.confirmPassword !== form.password) next["confirmPassword"] = "Passwords do not match.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await authService.register({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      toast.success("Account created", { description: "Let's complete your profile next." });
      navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Find the right skills. Build the right team."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <TextField
          label="Full name"
          name="fullName"
          placeholder="Aarav Sharma"
          value={form.fullName}
          error={errors["fullName"]}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          placeholder="you@college.edu"
          value={form.email}
          error={errors["email"]}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          placeholder="••••••••"
          hint="At least 6 characters."
          value={form.password}
          error={errors["password"]}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <TextField
          label="Confirm password"
          name="confirmPassword"
          type="password"
          placeholder="••••••••"
          value={form.confirmPassword}
          error={errors["confirmPassword"]}
          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
        />
        <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
          {loading ? "Creating account…" : "Register"}
        </Button>
      </form>
    </AuthLayout>
  );
}
