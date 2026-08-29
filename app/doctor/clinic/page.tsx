"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  listMyMemberships,
  listMyOrganizations,
  listOrganizationMembers,
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
import { DEFAULT_ORGANIZATION_SLUG } from "@/lib/org/constants";
import { Loader2, Plus } from "lucide-react";

export default function DoctorClinicPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [members, setMembers] = useState<OrganizationMemberRow[]>([]);
  const [invites, setInvites] = useState<OrganizationInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<OrganizationKind>("clinic");
  const [city, setCity] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Exclude<OrganizationMemberRole, "owner">>("doctor");
  const [memberships, setMemberships] = useState<
    Array<{ organization_id: string; member_role: OrganizationMemberRole }>
  >([]);

  const owned = useMemo(
    () =>
      orgs.filter((org) =>
        memberships.some(
          (m) => m.organization_id === org.id && (m.member_role === "owner" || m.member_role === "admin")
        )
      ),
    [orgs, memberships]
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const [rows, mine] = await Promise.all([listMyOrganizations(), listMyMemberships()]);
      setOrgs(rows);
      setMemberships(mine);
      if (rows[0]) {
        const [memberRows, inviteRows] = await Promise.all([
          Promise.all(rows.map((org) => listOrganizationMembers(org.id))).then((groups) => groups.flat()),
          Promise.all(rows.map((org) => listPendingInvites(org.id))).then((groups) => groups.flat()),
        ]);
        setMembers(memberRows);
        setInvites(inviteRows);
      } else {
        setMembers([]);
        setInvites([]);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load clinic"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const manageOrg =
    owned.find((org) => org.slug !== DEFAULT_ORGANIZATION_SLUG) ?? owned[0] ?? orgs[0] ?? null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await createOrganization({ name, kind, city });
      setName("");
      setCity("");
      setMessage("Your clinic was created. You are the owner. Invite other doctors from here.");
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not create clinic"));
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manageOrg) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await inviteOrganizationMember({
        organizationId: manageOrg.id,
        email: inviteEmail,
        role: inviteRole,
      });
      if (result.status === "added") {
        setMessage(`${inviteEmail} was added to ${manageOrg.name}.`);
      } else {
        setMessage(`Invite created. Share ${window.location.origin}${inviteJoinPath(result.token)}`);
      }
      setInviteEmail("");
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not invite"));
    } finally {
      setSaving(false);
    }
  };

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
        <h1 className="text-2xl font-semibold text-slate-900">My clinic</h1>
        <p className="mt-1 text-sm text-slate-600">
          Create your own clinic or hospital, then invite other doctors. Reception logins still live under Reception / Staff.
        </p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      {orgs.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{manageOrg?.name ?? "Clinic"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Type: {manageOrg?.kind.replace("_", " ")}
              {manageOrg?.city ? ` · ${manageOrg.city}` : ""}
            </p>
            {owned.length > 0 && manageOrg ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={manageOrg.is_publicly_listed}
                  onChange={(e) => {
                    const next = e.target.checked;
                    void updateOrganization({ id: manageOrg.id, listed: next })
                      .then(() => load())
                      .catch((err) => setError(getErrorMessage(err, "Could not update listing")));
                  }}
                />
                List this clinic on the public /clinics directory
              </label>
            ) : null}
            {owned.length > 0 && manageOrg ? (
              <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => void handleInvite(e)}>
                <div className="min-w-[220px] flex-1">
                  <Label htmlFor="doc-invite-email">Invite by email</Label>
                  <Input
                    id="doc-invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="doc-invite-role">Role</Label>
                  <select
                    id="doc-invite-role"
                    className="mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as Exclude<OrganizationMemberRole, "owner">)}
                  >
                    <option value="doctor">Doctor</option>
                    <option value="receptionist">Receptionist</option>
                    <option value="admin">Clinic admin</option>
                  </select>
                </div>
                <Button type="submit" disabled={saving || !manageOrg}>
                  Invite
                </Button>
              </form>
            ) : null}

            <div className="divide-y rounded-lg border">
              {members
                .filter((member) => member.organization_id === manageOrg?.id)
                .map((member) => (
                  <div key={member.id} className="flex justify-between px-3 py-2 text-sm">
                    <span>
                      {member.full_name || member.email}{" "}
                      <span className="text-muted-foreground">{member.email}</span>
                    </span>
                    <span className="text-xs uppercase text-muted-foreground">{member.member_role}</span>
                  </div>
                ))}
            </div>

            {invites.filter((invite) => invite.organization_id === manageOrg?.id).length > 0 ? (
              <div className="space-y-2">
                {invites
                  .filter((invite) => invite.organization_id === manageOrg?.id)
                  .map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <span>
                        Pending: {invite.email} ({invite.member_role})
                      </span>
                      <Button variant="outline" size="sm" onClick={() => void revokeOrganizationInvite(invite.id).then(load)}>
                        Revoke
                      </Button>
                    </div>
                  ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Create a clinic</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={(e) => void handleCreate(e)}>
            <div>
              <Label htmlFor="clinic-name">Clinic or hospital name</Label>
              <Input id="clinic-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="clinic-kind">Type</Label>
              <select
                id="clinic-kind"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={kind}
                onChange={(e) => setKind(e.target.value as OrganizationKind)}
              >
                <option value="clinic">Clinic</option>
                <option value="hospital">Hospital</option>
                <option value="solo_practice">Solo practice</option>
              </select>
            </div>
            <div>
              <Label htmlFor="clinic-city">City</Label>
              <Input id="clinic-city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Create clinic
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
