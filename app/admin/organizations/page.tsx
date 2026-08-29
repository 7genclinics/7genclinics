"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { getErrorMessage } from "@/lib/errors";
import {
  updateOrganization,
  createOrganization,
  inviteJoinPath,
  inviteOrganizationMember,
  listOrganizationMembers,
  listOrganizations,
  listPendingInvites,
  revokeOrganizationInvite,
} from "@/lib/org/api";
import type {
  Organization,
  OrganizationInvite,
  OrganizationKind,
  OrganizationMemberRole,
  OrganizationMemberRow,
} from "@/lib/org/types";
import { Building2, Loader2, Plus, RefreshCw } from "lucide-react";

const KINDS: { value: OrganizationKind; label: string }[] = [
  { value: "clinic", label: "Clinic" },
  { value: "hospital", label: "Hospital" },
  { value: "solo_practice", label: "Solo practice" },
];

export default function AdminOrganizationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [members, setMembers] = useState<OrganizationMemberRow[]>([]);
  const [invites, setInvites] = useState<OrganizationInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<OrganizationKind>("clinic");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [listed, setListed] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Exclude<OrganizationMemberRole, "owner">>("doctor");

  const load = useCallback(async () => {
    setError(null);
    try {
      const rows = await listOrganizations();
      setOrgs(rows);
      setSelectedId((current) => current ?? rows[0]?.id ?? null);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load clinics"));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (organizationId: string) => {
    try {
      const [memberRows, inviteRows] = await Promise.all([
        listOrganizationMembers(organizationId),
        listPendingInvites(organizationId),
      ]);
      setMembers(memberRows);
      setInvites(inviteRows);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load members"));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const id = await createOrganization({ name, kind, city, phone, listed });
      setName("");
      setCity("");
      setPhone("");
      setMessage("Clinic created. It has its own subscription period (about two months).");
      await load();
      setSelectedId(id);
    } catch (err) {
      setError(getErrorMessage(err, "Could not create clinic"));
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await inviteOrganizationMember({
        organizationId: selectedId,
        email: inviteEmail,
        role: inviteRole,
      });
      if (result.status === "added") {
        setMessage(`${inviteEmail} was added immediately.`);
      } else {
        const path = inviteJoinPath(result.token);
        setMessage(`Invite created. Share ${window.location.origin}${path}`);
      }
      setInviteEmail("");
      await loadDetail(selectedId);
    } catch (err) {
      setError(getErrorMessage(err, "Could not invite"));
    } finally {
      setSaving(false);
    }
  };

  const selected = orgs.find((org) => org.id === selectedId) ?? null;

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Clinics & hospitals</h2>
        <p className="text-sm text-muted-foreground">
          Create a tenant and invite doctors or reception staff. Billing is per clinic.
        </p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create organization</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={(e) => void handleCreate(e)}>
              <div>
                <Label htmlFor="org-name">Name</Label>
                <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="org-kind">Type</Label>
                <select
                  id="org-kind"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={kind}
                  onChange={(e) => setKind(e.target.value as OrganizationKind)}
                >
                  {KINDS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="org-city">City</Label>
                <Input id="org-city" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="org-phone">Phone</Label>
                <Input id="org-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={listed} onChange={(e) => setListed(e.target.checked)} />
                List in the public clinic directory
              </label>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Create
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Organizations</CardTitle>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {orgs.map((org) => (
              <button
                key={org.id}
                type="button"
                onClick={() => setSelectedId(org.id)}
                className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left text-sm ${
                  org.id === selectedId ? "border-brand-400 bg-brand-50" : "border-border"
                }`}
              >
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                <span>
                  <span className="font-medium">{org.name}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {org.kind.replace("_", " ")} · {org.slug} · {org.status}
                    {org.city ? ` · ${org.city}` : ""}
                  </span>
                </span>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {selected ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {selected.name} members
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.is_publicly_listed}
                onChange={(e) => {
                  const next = e.target.checked;
                  void (async () => {
                    try {
                      await updateOrganization({ id: selected.id, listed: next });
                      setOrgs((rows) =>
                        rows.map((org) =>
                          org.id === selected.id ? { ...org, is_publicly_listed: next } : org
                        )
                      );
                    } catch (err) {
                      setError(getErrorMessage(err, "Could not update listing"));
                    }
                  })();
                }}
              />
              Show on /clinics public directory
            </label>
            <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => void handleInvite(e)}>
              <div className="min-w-[220px] flex-1">
                <Label htmlFor="invite-email">Invite email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="invite-role">Role</Label>
                <select
                  id="invite-role"
                  className="mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as Exclude<OrganizationMemberRole, "owner">)}
                >
                  <option value="doctor">Doctor</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="admin">Clinic admin</option>
                </select>
              </div>
              <Button type="submit" disabled={saving}>
                Invite
              </Button>
            </form>

            <div className="divide-y rounded-lg border">
              {members.length === 0 ? (
                <p className="px-3 py-4 text-sm text-muted-foreground">No members yet.</p>
              ) : (
                members.map((member) => (
                  <div key={member.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span>
                      <span className="font-medium">{member.full_name || member.email}</span>
                      <span className="ml-2 text-muted-foreground">{member.email}</span>
                    </span>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      {member.member_role}
                      {member.is_active ? "" : " · inactive"}
                    </span>
                  </div>
                ))
              )}
            </div>

            {invites.length > 0 ? (
              <div>
                <p className="mb-2 text-sm font-medium">Pending invites</p>
                <div className="space-y-2">
                  {invites.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <span>
                        {invite.email} · {invite.member_role}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          void (async () => {
                            await revokeOrganizationInvite(invite.id);
                            if (selectedId) await loadDetail(selectedId);
                          })();
                        }}
                      >
                        Revoke
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
