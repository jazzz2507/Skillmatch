import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/components/AuthLayout";
import { TextField } from "@/components/FormField";
import { authService } from "@/services";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — SkillMatch" },
      { name: "description", content: "Log in to SkillMatch to see your project matches and team requests." },
      { property: "og:title", content: "Log in — SkillMatch" },
      { property: "og:description", content: "Access your SkillMatch dashboard." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.email) next["email"] = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next["email"] = "Enter a valid email address.";
    if (!form.password) next["password"] = "Password is required.";
    else if (form.password.length < 6) next["password"] = "Password must be at least 6 characters.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!validate()) return;
    setLoading(true);
    try {
      const { user } = await authService.login(form);
      toast.success(`Welcome back, ${user.fullName.split(" ")[0] || "friend"}!`);
      navigate({ to: "/dashboard" });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to log in right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to pick up where your team left off."
      footer={
        <>
          New to SkillMatch?{" "}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {formError && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            {formError}
          </div>
        )}
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
          value={form.password}
          error={errors["password"]}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
          {loading ? "Logging in…" : "Log in"}
        </Button>
      </form>
    </AuthLayout>
  );
}