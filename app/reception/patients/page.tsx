"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { searchPatients } from "@/lib/clinic/api";
import type { Profile } from "@/types";
import { Search } from "lucide-react";

export default function ReceptionPatientsPage() {
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<Profile[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (query.trim().length < 2) {
        setPatients([]);
        return;
      }
      void searchPatients(query).then(setPatients).catch(() => setPatients([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Patients</h2>
        <p className="text-sm text-muted-foreground">Look up a patient by name, phone, email, or code.</p>
      </div>
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-10"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Start typing to search"
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Results</CardTitle>
        </CardHeader>
        <CardContent>
          {patients.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {query.trim().length < 2 ? "Enter at least 2 characters." : "No matching patients."}
            </p>
          ) : (
            <ul className="divide-y">
              {patients.map((p) => (
                <li key={p.id} className="py-3">
                  <Link href={`/reception/patients/${p.id}`} className="block hover:underline">
                    <p className="font-medium">{p.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.patient_code} · {p.phone ?? "no phone"} · {p.city ?? "—"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
