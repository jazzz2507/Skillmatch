import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Github, Save } from "lucide-react";
import type { Skill } from "@/services/types";
import { AppShell } from "@/components/AppShell";
import { TextAreaField, TextField } from "@/components/FormField";
import { SkillSelector } from "@/components/SkillSelector";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/StateViews";
import { profileService } from "@/services";


export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — SkillMatch" },
      {
        name: "description",
        content:
          "Edit your SkillMatch profile: bio, GitHub link and the technical skills used for project matching.",
      },
      {
        property: "og:title",
        content: "Your profile — SkillMatch",
      },
      {
        property: "og:description",
        content: "Keep your skills up to date for better matches.",
      },
    ],
  }),

  component: ProfilePage,
});

function ProfilePage() {
  const queryClient = useQueryClient();

  // --------------------------------------------------
  // GET PROFILE
  // --------------------------------------------------
  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: () => profileService.getProfile(),
  });

  // --------------------------------------------------
  // GET SKILL CATALOG
  // --------------------------------------------------
  const catalog = useQuery({
    queryKey: ["skills"],
    queryFn: () => profileService.getSkillCatalog(),
  });

  // --------------------------------------------------
  // PROFILE FORM
  // --------------------------------------------------
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    bio: "",
    githubUrl: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // --------------------------------------------------
  // LOAD PROFILE DATA INTO FORM
  // --------------------------------------------------
  useEffect(() => {
    if (profile.data) {
      setForm({
        fullName: profile.data.fullName ?? "",
        email: profile.data.email ?? "",
        bio: profile.data.bio ?? "",
        githubUrl: profile.data.githubUrl ?? "",
      });
    }
  }, [profile.data]);

  // --------------------------------------------------
  // SAVE PROFILE
  // --------------------------------------------------
  const save = useMutation({
    mutationFn: (payload: Partial<typeof form>) =>
      profileService.updateProfile(payload),

    onSuccess: (user) => {
      queryClient.setQueryData(["profile"], user);

      toast.success("Profile updated", {
        description: "Your changes have been saved.",
      });
    },

    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Couldn't save your profile."
      );
    },
  });

  // --------------------------------------------------
  // ADD / REMOVE SKILL
  // --------------------------------------------------
  const skillMutation = useMutation({
    mutationFn: ({
      skill,
      action,
    }: {
      skill: Skill;
      action: "add" | "remove";
    }) => {
      if (action === "add") {
        return profileService.addSkill(skill);
      }

      // removeSkill expects the skill name
      return profileService.removeSkill(skill.name);
    },

    onSuccess: (user) => {
      queryClient.setQueryData(["profile"], user);
    },

    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Couldn't update your skills."
      );
    },
  });

  // --------------------------------------------------
  // SAVE PROFILE FORM
  // --------------------------------------------------
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const next: Record<string, string> = {};

    if (form.fullName.trim().length < 3) {
      next["fullName"] = "Enter your full name.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next["email"] = "Enter a valid email address.";
    }

    if (
      form.githubUrl &&
      !form.githubUrl.startsWith("http://") &&
      !form.githubUrl.startsWith("https://")
    ) {
      next["githubUrl"] = "Enter a full URL.";
    }

    setErrors(next);

    if (Object.keys(next).length > 0) {
      return;
    }

    save.mutate(form);
  };

  // --------------------------------------------------
  // PROFILE ERROR
  // --------------------------------------------------
  if (profile.isError) {
    return (
      <AppShell title="Your profile">
        <ErrorState
          message={
            profile.error instanceof Error
              ? profile.error.message
              : "Couldn't load your profile."
          }
          onRetry={() => profile.refetch()}
        />
      </AppShell>
    );
  }

  // --------------------------------------------------
  // PAGE
  // --------------------------------------------------
  return (
    <AppShell
      title="Your profile"
      description="This is what project owners see when you request to join their team."
    >
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">

        {/* =====================================================
            PERSONAL DETAILS
        ====================================================== */}
        <form
          onSubmit={onSubmit}
          className="surface-card space-y-4 p-6"
          noValidate
        >
          <h2 className="text-lg font-semibold">
            Personal details
          </h2>

          {profile.isLoading ? (
            <div className="space-y-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton
                  key={i}
                  className="h-11 w-full rounded-xl"
                />
              ))}
            </div>
          ) : (
            <>
              {/* FULL NAME */}
              <TextField
                label="Full name"
                name="fullName"
                value={form.fullName}
                error={errors["fullName"]}
                onChange={(e) =>
                  setForm({
                    ...form,
                    fullName: e.target.value,
                  })
                }
              />

              {/* EMAIL */}
              <TextField
                label="Email"
                name="email"
                type="email"
                value={form.email}
                error={errors["email"]}
                onChange={(e) =>
                  setForm({
                    ...form,
                    email: e.target.value,
                  })
                }
              />

              {/* BIO */}
              <TextAreaField
                label="Bio"
                name="bio"
                value={form.bio}
                hint="A short intro helps owners understand what you bring."
                onChange={(e) =>
                  setForm({
                    ...form,
                    bio: e.target.value,
                  })
                }
              />

              {/* GITHUB */}
              <TextField
                label="GitHub URL"
                name="githubUrl"
                placeholder="https://github.com/username"
                value={form.githubUrl}
                error={errors["githubUrl"]}
                onChange={(e) =>
                  setForm({
                    ...form,
                    githubUrl: e.target.value,
                  })
                }
              />

              {/* SAVE */}
              <Button
                type="submit"
                variant="hero"
                disabled={save.isPending}
              >
                <Save />

                {save.isPending
                  ? "Saving..."
                  : "Save changes"}
              </Button>
            </>
          )}
        </form>

        {/* =====================================================
            RIGHT SIDE
        ====================================================== */}
        <div className="space-y-5">

          {/* =================================================
              PROFILE STRENGTH
          ================================================== */}
          <section className="surface-card p-6">
            <h2 className="text-lg font-semibold">
              Profile strength
            </h2>

            <div className="mt-4 flex items-baseline justify-between">
              <span className="font-display text-3xl font-bold">
                {profile.data?.profileCompletion ?? 0}%
              </span>

              <span className="text-xs text-muted-foreground">
                complete
              </span>
            </div>

            <Progress
              value={profile.data?.profileCompletion ?? 0}
              className="mt-3 h-2"
            />

            {profile.data?.githubUrl && (
              <a
                href={profile.data.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <Github className="size-4" />

                {profile.data.githubUrl}
              </a>
            )}
          </section>
          
          {/* TECHNICAL SKILLS */}

          
          <section className="surface-card p-6">
            <h2 className="text-lg font-semibold">
              Technical skills
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Add or remove the technologies you want to be matched on.
            </p>

            <div className="mt-4">
              {profile.isLoading || catalog.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <SkillSelector
                  selected={
                    (profile.data?.skills ?? []).map((skill) => ({
                      id: skill,
                      name: skill,
                    }))
                  }
                  
                  catalog={catalog.data ?? []}
                  busy={skillMutation.isPending}

                  onAdd={(skill) => {
                    skillMutation.mutate({
                      skill,
                      action: "add",
                    });
                  }}

                  onRemove={(skill) => {
                    skillMutation.mutate({
                      skill,
                      action: "remove",
                    });
                  }}
                />
              )}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}