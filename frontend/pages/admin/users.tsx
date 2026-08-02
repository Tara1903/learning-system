import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";

import { LoadFailurePanel } from "@/components/LoadFailurePanel";
import { LoadingPanel } from "@/components/LoadingPanel";
import { RoleBadge } from "@/components/RoleBadge";
import { SectionCard } from "@/components/SectionCard";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useApi } from "@/hooks/useApi";
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
    photoUrl: string;
    dob: string;
    gender: string;
    schoolName: string;
    board: string;
    previousPercentage: string;
    fatherName: string;
    motherName: string;
    parentMobile: string;
    whatsappNumber: string;
    occupation: string;
    address: string;
    city: string;
    pinCode: string;
    subjectsToJoin: string;
    batchTiming: string;
    medium: string;
    weakSubjects: string;
    tuitionStartDate: string;
    medicalCondition: string;
    dateOfAdmission: string;
    feesPlan: string;
    discount: string;
    registrationFee: string;
    receiptNo: string;
    customStudentId: string;
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
    guardianName: "",
    photoUrl: "",
    dob: "",
    gender: "",
    schoolName: "",
    board: "",
    previousPercentage: "",
    fatherName: "",
    motherName: "",
    parentMobile: "",
    whatsappNumber: "",
    occupation: "",
    address: "",
    city: "",
    pinCode: "",
    subjectsToJoin: "",
    batchTiming: "",
    medium: "",
    weakSubjects: "",
    tuitionStartDate: "",
    medicalCondition: "",
    dateOfAdmission: "",
    feesPlan: "",
    discount: "",
    registrationFee: "",
    receiptNo: "",
    customStudentId: ""
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
      guardianName: user.profile?.guardianName ?? "",
      photoUrl: user.profile?.photoUrl ?? "",
      dob: user.profile?.dob ?? "",
      gender: user.profile?.gender ?? "",
      schoolName: user.profile?.schoolName ?? "",
      board: user.profile?.board ?? "",
      previousPercentage: user.profile?.previousPercentage ?? "",
      fatherName: user.profile?.fatherName ?? "",
      motherName: user.profile?.motherName ?? "",
      parentMobile: user.profile?.parentMobile ?? "",
      whatsappNumber: user.profile?.whatsappNumber ?? "",
      occupation: user.profile?.occupation ?? "",
      address: user.profile?.address ?? "",
      city: user.profile?.city ?? "",
      pinCode: user.profile?.pinCode ?? "",
      subjectsToJoin: user.profile?.subjectsToJoin ?? "",
      batchTiming: user.profile?.batchTiming ?? "",
      medium: user.profile?.medium ?? "",
      weakSubjects: user.profile?.weakSubjects ?? "",
      tuitionStartDate: user.profile?.tuitionStartDate ?? "",
      medicalCondition: user.profile?.medicalCondition ?? "",
      dateOfAdmission: user.profile?.dateOfAdmission ?? "",
      feesPlan: user.profile?.feesPlan ?? "",
      discount: user.profile?.discount ?? "",
      registrationFee: user.profile?.registrationFee ?? "",
      receiptNo: user.profile?.receiptNo ?? "",
      customStudentId: user.profile?.customStudentId ?? ""
    }
  };
}

export default function AdminUsersPage() {
  const router = useRouter();
  const auth = useRequireAuth(["admin"]);
  const { user, status, error } = auth;
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
  const [statusUpdatingUserId, setStatusUpdatingUserId] = useState<string | null>(null);
  const formSectionRef = useRef<HTMLDivElement | null>(null);

  const {
    data: userResult,
    error: usersError,
    isLoading: loadingUsers,
    mutate: mutateUsers
  } = useApi<{ users: ManagedUser[]; pagination: PaginationMeta }>(
    status === "authenticated"
      ? `/admin/users?page=${pagination.page || 1}&pageSize=20${search.trim() ? `&search=${search.trim()}` : ""}${
          filterRole !== "all" ? `&role=${filterRole}` : ""
        }`
      : null
  );

  const { data: studentResult } = useApi<{ students: ManagedUser[] }>(
    status === "authenticated" ? `/admin/students?page=1&pageSize=50` : null
  );

  const users = userResult?.users || [];
  const studentOptions = studentResult?.students || [];

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleSearchChange = (newSearch: string) => {
    setSearch(newSearch);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleRoleChange = (newRole: FilterRole) => {
    setFilterRole(newRole);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  useEffect(() => {
    if (userResult?.pagination) {
      setPagination(userResult.pagination);
    }
  }, [userResult?.pagination]);

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

      await mutateUsers();
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

      if (!editingUserId) handlePageChange(1);
      await mutateUsers();
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

  if (usersError && !loadingUsers) {
    return (
      <DashboardLayout
        title="User provisioning"
        subtitle="Create, update, pause, and link institute accounts from one coordinated admin surface."
      >
        <LoadFailurePanel message={usersError.message} onRetry={() => void mutateUsers()} />
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
              <div className="space-y-6">
                <div className="rounded-[1.2rem] border border-soft p-5">
                  <p className="mb-4 text-xs uppercase tracking-[0.2em] text-[var(--accent)] font-semibold">1. Personal Details</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, dob: e.target.value}}))} placeholder="Date of Birth" value={form.profile.dob} />
                    <select className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, gender: e.target.value}}))} value={form.profile.gender}>
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none md:col-span-2" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, photoUrl: e.target.value}}))} placeholder="Photo URL (Optional)" value={form.profile.photoUrl} />
                  </div>
                </div>

                <div className="rounded-[1.2rem] border border-soft p-5">
                  <p className="mb-4 text-xs uppercase tracking-[0.2em] text-[var(--accent)] font-semibold">2. Academic Details</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, class: e.target.value}))} placeholder="Class e.g. 8" value={form.class} />
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, section: e.target.value}}))} placeholder="Section" value={form.profile.section} />
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none md:col-span-2" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, schoolName: e.target.value}}))} placeholder="School Name" value={form.profile.schoolName} />
                    <select className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, board: e.target.value}}))} value={form.profile.board}>
                      <option value="">Select Board</option>
                      <option value="CBSE">CBSE</option>
                      <option value="ICSE">ICSE</option>
                      <option value="MP Board">MP Board</option>
                      <option value="Other">Other</option>
                    </select>
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, previousPercentage: e.target.value}}))} placeholder="Previous Class Percentage/Grade" value={form.profile.previousPercentage} />
                  </div>
                </div>

                <div className="rounded-[1.2rem] border border-soft p-5">
                  <p className="mb-4 text-xs uppercase tracking-[0.2em] text-[var(--accent)] font-semibold">3. Tuition Preferences</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none md:col-span-2" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, subjectsToJoin: e.target.value}}))} placeholder="Subjects to Join" value={form.profile.subjectsToJoin} />
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, batchTiming: e.target.value}}))} placeholder="Batch Timing Preference" value={form.profile.batchTiming} />
                    <select className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, medium: e.target.value}}))} value={form.profile.medium}>
                      <option value="">Select Medium</option>
                      <option value="English">English</option>
                      <option value="Hindi">Hindi</option>
                    </select>
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none md:col-span-2" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, weakSubjects: e.target.value}}))} placeholder="Weak Subjects" value={form.profile.weakSubjects} />
                    
                    <div className="flex flex-col">
                      <span className="text-xs text-muted mb-1 ml-2">Tuition Start Date</span>
                      <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, tuitionStartDate: e.target.value}}))} type="date" placeholder="Tuition Start Date" value={form.profile.tuitionStartDate} />
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.2rem] border border-soft p-5">
                  <p className="mb-4 text-xs uppercase tracking-[0.2em] text-[var(--accent)] font-semibold">4. Parent / Guardian Details</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, fatherName: e.target.value}}))} placeholder="Father's Name" value={form.profile.fatherName} />
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, motherName: e.target.value}}))} placeholder="Mother's Name" value={form.profile.motherName} />
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none md:col-span-2" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, guardianName: e.target.value}}))} placeholder="Guardian Name (if applicable)" value={form.profile.guardianName} />
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, parentMobile: e.target.value}}))} placeholder="Parent/Guardian Mobile Number" value={form.profile.parentMobile} />
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, whatsappNumber: e.target.value}}))} placeholder="WhatsApp Number" value={form.profile.whatsappNumber} />
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none md:col-span-2" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, occupation: e.target.value}}))} placeholder="Occupation (Optional)" value={form.profile.occupation} />
                  </div>
                </div>

                <div className="rounded-[1.2rem] border border-soft p-5">
                  <p className="mb-4 text-xs uppercase tracking-[0.2em] text-[var(--accent)] font-semibold">5. Address</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none md:col-span-2" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, address: e.target.value}}))} placeholder="Complete Address" value={form.profile.address} />
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, city: e.target.value}}))} placeholder="City" value={form.profile.city} />
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, pinCode: e.target.value}}))} placeholder="PIN Code" value={form.profile.pinCode} />
                  </div>
                </div>

                <div className="rounded-[1.2rem] border border-soft p-5">
                  <p className="mb-4 text-xs uppercase tracking-[0.2em] text-[var(--accent)] font-semibold">6. Medical & Office Use</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none md:col-span-2" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, medicalCondition: e.target.value}}))} placeholder="Any Medical Condition/Allergy (Optional)" value={form.profile.medicalCondition} />
                    
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, admissionNumber: e.target.value}}))} placeholder="Admission No. (Office)" value={form.profile.admissionNumber} />
                    <div className="flex flex-col">
                      <span className="text-xs text-muted mb-1 ml-2">Date of Admission</span>
                      <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, dateOfAdmission: e.target.value}}))} type="date" value={form.profile.dateOfAdmission} />
                    </div>
                    <select className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, feesPlan: e.target.value}}))} value={form.profile.feesPlan}>
                      <option value="">Select Fees Plan</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Half-Yearly">Half-Yearly</option>
                      <option value="Yearly">Yearly</option>
                    </select>
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, discount: e.target.value}}))} placeholder="Discount (if any)" value={form.profile.discount} />
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, registrationFee: e.target.value}}))} placeholder="Registration Fee" value={form.profile.registrationFee} />
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, receiptNo: e.target.value}}))} placeholder="Receipt No." value={form.profile.receiptNo} />
                    <input className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none md:col-span-2" onChange={(e) => setForm(c => ({...c, profile: {...c.profile, customStudentId: e.target.value}}))} placeholder="Student ID (Office)" value={form.profile.customStudentId} />
                  </div>
                </div>
              </div>
            ) : formRole === "teacher" ? (
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
              </div>
            ) : (
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
            )}

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
                    onClick={() => handlePageChange(pagination.page - 1)}
                    type="button"
                  >
                    Previous
                  </button>
                  <button
                    className="rounded-full border border-soft px-4 py-2 text-sm"
                    disabled={!pagination.hasNextPage}
                    onClick={() => handlePageChange(pagination.page + 1)}
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
