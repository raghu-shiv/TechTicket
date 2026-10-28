"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Save, UserRound } from "lucide-react";
import Image from "next/image";
import { PageHeader } from "@/components/shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { authClient, useSession } from "@/lib/auth-client";

interface ProfileDraft {
  userId: string;
  name: string;
  image: string;
}

function formatDate(value: Date | string | number): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
}

export default function ProfilePage() {
  const { data: session, isPending } = useSession();
  const user = session?.user;

  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const draftMatchesUser = Boolean(user && draft?.userId === user.id);

  const name = user ? (draftMatchesUser ? draft!.name : user.name) : "";

  const image = user
    ? draftMatchesUser
      ? draft!.image
      : (user.image ?? "")
    : "";

  const isDirty =
    Boolean(user) && (name !== user!.name || image !== (user!.image ?? ""));

  function changeName(value: string) {
    if (!user) return;

    setDraft({
      userId: user.id,
      name: value,
      image,
    });
    setFormError(null);
    setSuccessMessage(null);
  }

  function changeImage(value: string) {
    if (!user) return;

    setDraft({
      userId: user.id,
      name,
      image: value,
    });
    setFormError(null);
    setSuccessMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user || isSaving) return;

    const normalizedName = name.trim();
    const normalizedImage = image.trim();

    if (!normalizedName) {
      setFormError("Display name is required.");
      return;
    }

    if (normalizedName.length > 100) {
      setFormError("Display name must be 100 characters or fewer.");
      return;
    }

    if (normalizedImage) {
      try {
        const parsedUrl = new URL(normalizedImage);

        if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
          setFormError("Profile image URL must use HTTP or HTTPS.");
          return;
        }
      } catch {
        setFormError("Enter a valid profile image URL, or leave it blank.");
        return;
      }
    }

    setIsSaving(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const result = await authClient.updateUser({
        name: normalizedName,
        image: normalizedImage || null,
      });

      if (result.error) {
        setFormError(result.error.message || "Unable to update your profile.");
        return;
      }

      setDraft({
        userId: user.id,
        name: normalizedName,
        image: normalizedImage,
      });
      setSuccessMessage("Your profile has been updated.");
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to update your profile. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isPending) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Your Profile"
          description="View and update your personal account details."
          className="mb-0"
        />

        <Card>
          <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Loading your profile...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Your Profile"
          description="View and update your personal account details."
          className="mb-0"
        />

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-destructive" role="alert">
              Your profile could not be loaded. Refresh the page or sign in
              again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const initials =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "U";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your Profile"
        description="Manage the personal details associated with your TechTicket account."
        className="mb-0"
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-primary/10 text-sm font-semibold text-primary">
              {image ? (
                <Image
                  src={image}
                  alt={`${name || "Profile"} profile picture`}
                  fill
                  sizes="48px"
                  unoptimized
                  className="object-cover"
                />
              ) : (
                initials
              )}
            </div>

            <div className="min-w-0">
              <CardTitle>Account details</CardTitle>
              <CardDescription className="mt-1">
                Changes apply to your own authenticated account.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="profile-name" className="text-sm font-medium">
                  Display name
                </label>

                <input
                  id="profile-name"
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={100}
                  value={name}
                  onChange={(event) => changeName(event.target.value)}
                  disabled={isSaving}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="profile-image" className="text-sm font-medium">
                  Profile image URL
                  <span className="ml-1 font-normal text-muted-foreground">
                    (optional)
                  </span>
                </label>

                <input
                  id="profile-image"
                  name="image"
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  placeholder="https://example.com/photo.png"
                  value={image}
                  onChange={(event) => changeImage(event.target.value)}
                  disabled={isSaving}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />

                <p className="text-xs text-muted-foreground">
                  Use an HTTP or HTTPS image URL. Clear this field to remove the
                  stored image URL.
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="profile-email" className="text-sm font-medium">
                  Email address
                </label>

                <input
                  id="profile-email"
                  value={user.email}
                  readOnly
                  aria-readonly="true"
                  className="h-11 w-full cursor-not-allowed rounded-xl border border-input bg-muted/40 px-3 text-sm text-muted-foreground"
                />

                <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs leading-5 text-muted-foreground">
                  Email changes are not enabled in the current configuration.
                </p>
              </div>

              <div className="space-y-2">
                <span className="block text-sm font-medium">
                  Email verification
                </span>

                <div className="flex h-10 items-center">
                  {user.emailVerified ? (
                    <Badge variant="secondary">
                      <CheckCircle2
                        className="mr-1 size-3.5"
                        aria-hidden="true"
                      />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline">Not verified</Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <span className="block text-sm font-medium">
                  Account created
                </span>

                <p className="text-sm text-muted-foreground">
                  {formatDate(user.createdAt)}
                </p>
              </div>
            </div>

            {formError && (
              <p
                className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
                role="alert"
              >
                {formError}
              </p>
            )}

            {successMessage && (
              <p
                className="rounded-xl border border-success/25 bg-success/10 px-3 py-2.5 text-sm text-success"
                role="status"
              >
                {successMessage}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
              <p className="text-xs text-muted-foreground">
                Only your display name and profile image can be changed here.
              </p>

              <button
                type="submit"
                disabled={isSaving || !isDirty || !name.trim()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="size-4" aria-hidden="true" />
                )}

                {isSaving ? "Saving..." : "Save profile"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-start gap-3 rounded-2xl border border-border bg-muted/20 p-5 sm:p-6">
          <UserRound
            className="mt-0.5 size-5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />

          <div>
            <h2 className="text-sm font-semibold">Account security</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Password changes, email changes, and other authentication settings
              are not exposed on this profile page. They should be implemented
              separately with the appropriate authentication and verification
              flows.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
