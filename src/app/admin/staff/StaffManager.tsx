"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button } from "@/components/luxury";
import { roleLabel } from "@/lib/roles";

type StaffMember = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  twoFactorEnabled: boolean;
  createdAt: string;
};

export default function StaffManager({
  staff,
  currentUserId,
  superAdminCount
}: {
  staff: StaffMember[];
  currentUserId: string;
  superAdminCount: number;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", email: "", password: "", role: "ADMIN" });
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function changeRole(member: StaffMember, role: string, confirmText: string) {
    if (!window.confirm(confirmText)) return;

    setBusyId(member.id);
    setError(null);
    setNotice(null);

    const res = await fetch(`/api/admin/staff/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role })
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);

    if (!res.ok) {
      setError(data.error ?? "Could not update this account.");
      return;
    }

    setNotice(`${member.email} is now ${roleLabel(role).toLowerCase()}.`);
    router.refresh();
  }

  async function createStaff(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    setNotice(null);

    const res = await fetch("/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const data = await res.json().catch(() => ({}));
    setCreating(false);

    if (!res.ok) {
      setError(data.error ?? "Could not create this account.");
      return;
    }

    setNotice(`${form.email} can now sign in as ${roleLabel(form.role).toLowerCase()}.`);
    setForm({ name: "", email: "", password: "", role: "ADMIN" });
    setShowForm(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="border border-vienna-red/30 bg-vienna-red/5 p-4 text-sm text-vienna-red">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="border border-soft-300 bg-white p-4 text-sm text-soft-700">
          {notice}
        </p>
      )}

      <section className="glass rounded-3xl p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="admin-kicker">Current staff</p>
            <p className="mt-2 text-sm text-soft-500">
              {staff.length} {staff.length === 1 ? "account" : "accounts"} with admin access.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setShowForm((open) => !open)}>
            {showForm ? "Cancel" : "Add admin"}
          </Button>
        </div>

        {showForm && (
          <form onSubmit={createStaff} className="mt-6 border-t border-soft-200 pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="field-label">Name</span>
                <input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  required
                  className="input-soft"
                />
              </label>
              <label className="block">
                <span className="field-label">Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  required
                  className="input-soft"
                />
              </label>
              <label className="block">
                <span className="field-label">Temporary password</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  required
                  minLength={10}
                  className="input-soft"
                />
                <span className="mt-1.5 block text-xs text-soft-400">
                  At least 10 characters, with a letter and a number. Share it with them directly and
                  have them change it.
                </span>
              </label>
              <label className="block">
                <span className="field-label">Role</span>
                <select
                  value={form.role}
                  onChange={(event) => setForm({ ...form, role: event.target.value })}
                  className="input-soft"
                >
                  <option value="ADMIN">Admin — catalog and orders</option>
                  <option value="SUPER_ADMIN">Master admin — also manages staff</option>
                </select>
              </label>
            </div>

            <Button type="submit" loading={creating} className="mt-5">
              {creating ? "Creating" : "Create account"}
            </Button>
          </form>
        )}

        <div className="mt-6 space-y-3 border-t border-soft-200 pt-6">
          {staff.map((member) => {
            const isSelf = member.id === currentUserId;
            const isSuper = member.role === "SUPER_ADMIN";
            const isLastSuper = isSuper && superAdminCount <= 1;

            return (
              <div
                key={member.id}
                className="flex flex-col gap-3 border-b border-soft-200/60 pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-soft-700">{member.name ?? member.email}</p>
                    <Badge variant={isSuper ? "default" : "muted"}>{roleLabel(member.role)}</Badge>
                    {isSelf && <Badge variant="accent">You</Badge>}
                    {!member.twoFactorEnabled && <Badge variant="alert">No 2FA</Badge>}
                  </div>
                  <p className="mt-1 truncate text-xs text-soft-400">{member.email}</p>
                </div>

                <div className="flex shrink-0 gap-2">
                  {/* Acting on yourself is blocked in the API too; the button is
                      hidden here so the option never looks available. */}
                  {!isSelf && (
                    <>
                      {isSuper ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={busyId === member.id || isLastSuper}
                          title={isLastSuper ? "The only master admin cannot be demoted." : undefined}
                          onClick={() =>
                            changeRole(
                              member,
                              "ADMIN",
                              `Demote ${member.email} to a regular admin? They will lose access to staff management.`
                            )
                          }
                        >
                          Demote
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={busyId === member.id}
                          onClick={() =>
                            changeRole(
                              member,
                              "SUPER_ADMIN",
                              `Make ${member.email} a master admin? They will be able to grant and revoke admin access, including yours.`
                            )
                          }
                        >
                          Make master
                        </Button>
                      )}

                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busyId === member.id || isLastSuper}
                        title={isLastSuper ? "The only master admin cannot be revoked." : undefined}
                        onClick={() =>
                          changeRole(
                            member,
                            "CUSTOMER",
                            `Revoke admin access for ${member.email}? Their account, orders and audit history are kept — they simply become a customer again.`
                          )
                        }
                      >
                        Revoke
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
