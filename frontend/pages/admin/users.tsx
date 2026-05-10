import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";

import { LoadFailurePanel } from "@/components/LoadFailurePanel";
import { LoadingPanel } from "@/components/LoadingPanel";
import { RoleBadge } from "@/components/RoleBadge";
import { SectionCard } from "@/components/SectionCard";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { apiFetch } from "@/utils/api";
import type { ManagedUser, PaginationMeta, ProvisioningResult } from "@/utils/types";

type EditableRole = "admin" | "student" | "teacher" | "parent";
type CreateRole = Exclude<EditableRole, "admin">;
type FilterRole = "all" | EditableRole;

interface UserFormState {
  name: string;
  email: string;
  class: string;
  isActive: boolean;
  linkedStudentIds: string[];
  profile: {
    phone: string;
    section: string;
    admissionNumber: string;
    guardianName: string;
  };
}

const emptyFormState: UserFormState = {
  name: "",
  email: "",
  class: "",
  isActive: true,
  linkedStudentIds: [],
  profile: {
    phone: "",
    section: "",
    admissionNumber: "",
    guardianName: ""
  }
};

const emptyPagination: PaginationMeta = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false
};

function toFormState(user: ManagedUser): UserFormState {
  return {
    name: user.name,
    email: user.email,
    class: user.class ?? "",
    isActive: user.isActive,
    linkedStudentIds: user.linkedStudentIds ?? [],
    profile: {
      phone: user.profile?.phone ?? "",
      section: user.profile?.section ?? "",
      admissionNumber: user.profile?.admissionNumber ?? "",
      guardianName: user.profile?.guardianName ?? ""
    }
  };
}

export default function AdminUsersPage() {
  const router = useRouter();
  const auth = useRequireAuth(["admin"]);
  const { user, status, error } = auth;
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [studentOptions, setStudentOptions] = useState<ManagedUser[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(emptyPagination);
  const [message, setMessage] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [filterRole, setFilterRole] = useState<FilterRole>("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [formRole, setFormRole] = useState<EditableRole>("student");
  const [form, setForm] = useState<UserFormState>(emptyFormState);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [statusUpdatingUserId, setStatusUpdatingUserId] = useState<string | null>(null);
  const formSectionRef = useRef<HTMLDivElement | null>(null);

  async function loadUsers(page = pagination.page || 1, nextSearch = search, nextRole = filterRole) {
    setLoadingUsers(true);
    setLoadError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20"
      });

      if (nextSearch.trim()) {
        params.set("search", nextSearch.trim());
      }

      if (nextRole !== "all") {
        params.set("role", nextRole);
      }

      const [userResult, studentResult] = await Promise.all([
        apiFetch<{ users: ManagedUser[]; pagination: PaginationMeta }>(`/admin/users?${params.toString()}`),
        apiFetch<{ students: ManagedUser[] }>(`/admin/students?page=1&pageSize=50`)
      ]);

      setUsers(userResult.users);
      setPagination(userResult.pagination);
      setStudentOptions(studentResult.students);
    } catch (loadUsersError) {
      setLoadError(loadUsersError instanceof Error ? loadUsersError.message : "Unable to load the user directory.");
      setUsers([]);
      setPagination(emptyPagination);
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      void loadUsers(1, search, filterRole);
    }
  }, [status, search, filterRole]);

  useEffect(() => {
    if (!router.isReady || editingUserId) {
      return;
    }

    const requestedRole = Array.isArray(router.query.create) ? router.query.create[0] : router.query.create;

    if (requestedRole === "student" || requestedRole === "teacher" || requestedRole === "parent") {
      setFormRole(requestedRole);
      setMessage("");
      setInviteLink("");

      if (typeof window !== "undefined") {
        window.requestAnimationFrame(() => {
          formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    }
  }, [editingUserId, router.isReady, router.query.create]);

  function resetForm(nextRole: CreateRole = "student") {
    setEditingUserId(null);
    setFormRole(nextRole);
    setForm(emptyFormState);
    setInviteLink("");
  }

  function toggleLinkedStudent(studentId: string) {
    setForm((current) => ({
      ...current,
      linkedStudentIds: current.linkedStudentIds.includes(studentId)
        ? current.linkedStudentIds.filter((value) => value !== studentId)
        : [...current.linkedStudentIds, studentId]
    }));
  }

  function handleEdit(managedUser: ManagedUser) {
    setEditingUserId(managedUser.id);
    setFormRole(managedUser.role);
    setForm(toFormState(managedUser));
    setMessage("");
    setInviteLink("");
  }

  function focusCreateForm(nextRole: CreateRole) {
    resetForm(nextRole);

    void router.replace(
      {
        pathname: router.pathname,
        query: {
          ...router.query,
          create: nextRole
        }
      },
      undefined,
      { shallow: true }
    );

    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  async function handleStatusToggle(managedUser: ManagedUser) {
    setStatusUpdatingUserId(managedUser.id);
    setMessage("");
    setInviteLink("");

    try {
      await apiFetch<{ user: ManagedUser }>(`/admin/users/${managedUser.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !managedUser.isActive })
      });

      await loadUsers(pagination.page || 1);
      setMessage(managedUser.isActive ? "User paused successfully." : "User reactivated successfully.");
    } catch (toggleError) {
      setMessage(toggleError instanceof Error ? toggleError.message : "Unable to update account status right now.");
    } finally {
      setStatusUpdatingUserId(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setInviteLink("");

    try {
      const compactProfile = Object.fromEntries(Object.entries(form.profile).filter(([, value]) => value.trim()));
      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        isActive: form.isActive,
        profile: compactProfile
      };

      if (formRole === "student") {
        payload.class = form.class;
      }

      if (formRole === "parent") {
        payload.linkedStudentIds = form.linkedStudentIds;
      }

      if (editingUserId) {
        await apiFetch<{ user: ManagedUser }>(`/admin/users/${editingUserId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        setMessage("User updated successfully.");
      } else {
        const endpoint =
          formRole === "student"
            ? "/admin/create-student"
            : formRole === "teacher"
              ? "/admin/create-teacher"
              : "/admin/create-parent";

        const result = await apiFetch<ProvisioningResult>(endpoint, {
          method: "POST",
          body: JSON.stringify(payload)
        });

        setMessage(
          result.setupRequired
            ? "User created. Share the invite setup link to activate the account."
            : "User created successfully."
        );
        setInviteLink(result.setupUrl);
      }

      await loadUsers(editingUserId ? pagination.page || 1 : 1);
      if (editingUserId) {
        resetForm();
      } else {
        setEditingUserId(null);
        setFormRole("student");
        setForm(emptyFormState);
      }
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "Unable to save account changes right now.");
    } finally {
      setSaving(false);
    }
  }

  async function copyInviteLink() {
    if (!inviteLink) {
      return;
    }

    await navigator.clipboard.writeText(inviteLink);
    setMessage("Invite link copied to clipboard.");
  }

  if (!user || status === "loading" || status === "idle") {
    return <LoadingPanel label="Preparing user management..." />;
  }

  if (status === "error") {
    return (
      <LoadFailurePanel
        title="Admin access could not be verified"
        message={error || "The dashboard could not confirm your current session."}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (loadError && !loadingUsers) {
    return (
      <DashboardLayout
        title="User provisioning"
        subtitle="Create, update, pause, and link institute accounts from one coordinated admin surface."
      >
        <LoadFailurePanel message={loadError} onRetry={() => void loadUsers(1, search, filterRole)} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="User provisioning"
      subtitle="Create, update, pause, and link institute accounts from one coordinated admin surface."
      actions={
        <button
          className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white"
          onClick={() => focusCreateForm("student")}
          type="button"
        >
          Register student
        </button>
      }
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {(["student", "teacher", "parent", "admin"] as EditableRole[]).map((role) => (
          <div key={role} className="rounded-[1.3rem] border border-soft bg-surface px-5 py-4">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">{role}</p>
            <p className="mt-3 text-3xl font-semibold">
              {users.filter((managedUser) => managedUser.role === role).length}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div ref={formSectionRef}>
          <SectionCard
          title={editingUserId ? "Edit account" : "Create account"}
          eyebrow={editingUserId ? "Admin changes" : "Admin control"}
          action={
            editingUserId ? (
              <button className="rounded-full border border-soft px-4 py-2 text-sm" onClick={() => resetForm()} type="button">
                Create new instead
              </button>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(["student", "teacher", "parent"] as CreateRole[]).map((role) => (
                  <button
                    key={role}
                    className={`rounded-full border px-4 py-2 text-sm ${
                      formRole === role ? "border-[var(--accent)] text-[var(--accent)]" : "border-soft"
                    }`}
                    onClick={() => focusCreateForm(role)}
                    type="button"
                  >
                    {role === "student" ? "Register student" : role === "teacher" ? "Add teacher" : "Add parent"}
                  </button>
                ))}
              </div>
            )
          }
        >
          {!editingUserId && (
            <div className="mb-5 rounded-[1.2rem] border border-[rgba(212,175,55,0.22)] bg-[rgba(212,175,55,0.08)] px-4 py-4 text-sm text-muted">
              {formRole === "student"
                ? "Student registration is active. Fill in the details below to create a student account and generate the setup link."
                : formRole === "teacher"
                  ? "Teacher provisioning is active. Create the teacher account below and share the setup link."
                  : "Parent provisioning is active. Create the account below and link the correct student records."}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <input
                className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none"
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Full name"
                value={form.name}
              />
              <input
                className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none"
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="Email address"
                type="email"
                value={form.email}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">Role</p>
                {editingUserId ? (
                  <div className="mt-3">
                    <RoleBadge role={formRole} />
                  </div>
                ) : (
                  <select
                    className="mt-3 w-full bg-transparent outline-none"
                    onChange={(event) => setFormRole(event.target.value as CreateRole)}
                    value={formRole}
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="parent">Parent</option>
                  </select>
                )}
              </div>

              <div className="rounded-[1.2rem] border border-dashed border-soft px-4 py-3 text-sm text-muted">
                Invite-based password setup is enabled. New users receive a secure setup link instead of a temporary password.
              </div>
            </div>

            {formRole === "student" ? (
              <input
                className="w-full rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none"
                onChange={(event) => setForm((current) => ({ ...current, class: event.target.value }))}
                placeholder="Class e.g. 8"
                value={form.class}
              />
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <input
                className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    profile: {
                      ...current.profile,
                      phone: event.target.value
                    }
                  }))
                }
                placeholder="Phone number"
                value={form.profile.phone}
              />
              <input
                className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    profile: {
                      ...current.profile,
                      guardianName: event.target.value
                    }
                  }))
                }
                placeholder="Guardian or contact name"
                value={form.profile.guardianName}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <input
                className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    profile: {
                      ...current.profile,
                      section: event.target.value
                    }
                  }))
                }
                placeholder="Section"
                value={form.profile.section}
              />
              <input
                className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    profile: {
                      ...current.profile,
                      admissionNumber: event.target.value
                    }
                  }))
                }
                placeholder="Admission number"
                value={form.profile.admissionNumber}
              />
            </div>

            {formRole === "parent" ? (
              <div className="rounded-[1.2rem] border border-soft p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">Linked students</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {studentOptions.map((studentOption) => {
                    const selected = form.linkedStudentIds.includes(studentOption.id);
                    return (
                      <button
                        key={studentOption.id}
                        className={`rounded-[1.1rem] border px-4 py-3 text-left text-sm transition ${
                          selected ? "border-[var(--accent)] bg-[rgba(212,175,55,0.08)]" : "border-soft"
                        }`}
                        onClick={() => toggleLinkedStudent(studentOption.id)}
                        type="button"
                      >
                        <p className="font-medium">{studentOption.name}</p>
                        <p className="mt-1 text-muted">Class {studentOption.class}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <label className="flex items-center gap-3 rounded-[1.2rem] border border-soft px-4 py-3 text-sm">
              <input
                checked={form.isActive}
                onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                type="checkbox"
              />
              Account is active
            </label>

            <button className="rounded-full bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white" disabled={saving} type="submit">
              {saving
                ? "Saving..."
                : editingUserId
                  ? "Save account changes"
                  : formRole === "student"
                    ? "Register student"
                    : formRole === "teacher"
                      ? "Create teacher account"
                      : "Create parent account"}
            </button>

            {message ? <p className="text-sm text-muted">{message}</p> : null}

            {inviteLink ? (
              <div className="rounded-[1.2rem] border border-[rgba(212,175,55,0.25)] bg-[rgba(212,175,55,0.08)] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">Invite setup link</p>
                <p className="mt-2 break-all text-sm text-[var(--text)]">{inviteLink}</p>
                <button className="mt-4 rounded-full border border-soft px-4 py-2 text-sm" onClick={() => void copyInviteLink()} type="button">
                  Copy invite link
                </button>
              </div>
            ) : null}
          </form>
          </SectionCard>
        </div>

        <SectionCard title="User command board" eyebrow="Account visibility">
          <div className="mb-5 flex flex-col gap-3">
            <div className="flex flex-wrap gap-3">
              {(["all", "admin", "teacher", "student", "parent"] as FilterRole[]).map((role) => (
                <button
                  key={role}
                  className={`rounded-full border px-4 py-2 text-sm ${
                    filterRole === role ? "border-[var(--accent)] text-[var(--accent)]" : "border-soft"
                  }`}
                  onClick={() => setFilterRole(role)}
                  type="button"
                >
                  {role === "all" ? "All users" : role}
                </button>
              ))}
            </div>

            <form
              className="flex flex-col gap-3 md:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                setSearch(searchInput.trim());
              }}
            >
              <input
                className="flex-1 rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none"
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by name, email, or class"
                value={searchInput}
              />
              <button className="rounded-full border border-soft px-4 py-2 text-sm" type="submit">
                Search
              </button>
            </form>
          </div>

          {loadingUsers ? (
            <LoadingPanel label="Refreshing user directory..." />
          ) : (
            <>
              <div className="space-y-3">
                {users.map((managedUser) => (
                  <div key={managedUser.id} className="rounded-[1.3rem] border border-soft p-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-lg font-semibold">{managedUser.name}</p>
                          <RoleBadge role={managedUser.role} />
                          <span
                            className={`rounded-full px-3 py-1 text-xs ${
                              managedUser.isActive ? "bg-emerald-500/15 text-emerald-700" : "bg-rose-500/15 text-rose-700"
                            }`}
                          >
                            {managedUser.isActive ? "Active" : "Paused"}
                          </span>
                        </div>

                        <p className="text-sm text-muted">
                          {managedUser.email}
                          {managedUser.class ? ` · Class ${managedUser.class}` : ""}
                        </p>

                        {managedUser.role === "student" && managedUser.analytics ? (
                          <div className="flex flex-wrap gap-3 text-sm text-muted">
                            <span>Attendance {managedUser.analytics.attendancePercentage}%</span>
                            <span>Doubts {managedUser.analytics.doubtCount}</span>
                            <span>Practice {managedUser.analytics.practiceAccuracy}%</span>
                          </div>
                        ) : null}

                        {managedUser.role === "parent" && managedUser.linkedStudents?.length ? (
                          <div className="flex flex-wrap gap-2">
                            {managedUser.linkedStudents.map((student) => (
                              <span key={student.id} className="rounded-full border border-soft px-3 py-1 text-xs text-muted">
                                {student.name} · Class {student.class}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          className="rounded-full border border-soft px-4 py-2 text-sm"
                          onClick={() => handleEdit(managedUser)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-full border border-soft px-4 py-2 text-sm"
                          disabled={statusUpdatingUserId === managedUser.id}
                          onClick={() => void handleStatusToggle(managedUser)}
                          type="button"
                        >
                          {statusUpdatingUserId === managedUser.id
                            ? "Updating..."
                            : managedUser.isActive
                              ? "Pause account"
                              : "Reactivate"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between gap-4">
                <p className="text-sm text-muted">
                  Showing page {pagination.page} of {Math.max(pagination.totalPages, 1)} · {pagination.total} users
                </p>
                <div className="flex gap-3">
                  <button
                    className="rounded-full border border-soft px-4 py-2 text-sm"
                    disabled={!pagination.hasPreviousPage}
                    onClick={() => void loadUsers(pagination.page - 1)}
                    type="button"
                  >
                    Previous
                  </button>
                  <button
                    className="rounded-full border border-soft px-4 py-2 text-sm"
                    disabled={!pagination.hasNextPage}
                    onClick={() => void loadUsers(pagination.page + 1)}
                    type="button"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </SectionCard>
      </div>
    </DashboardLayout>
  );
}
