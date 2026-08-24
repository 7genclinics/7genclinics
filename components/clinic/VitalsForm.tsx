"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  bmiLabel,
  calcBmi,
  cmToFeetInches,
  feetInchesToCm,
  validateVitals,
  type ClinicVitals,
} from "@/lib/clinic/types";
import { cn } from "@/lib/utils";

type VitalsValue = Omit<ClinicVitals, "id" | "consultation_id">;

export function VitalsForm({
  value,
  onChange,
  readOnly,
}: {
  value: VitalsValue;
  onChange?: (next: VitalsValue) => void;
  readOnly?: boolean;
}) {
  const set = (patch: Partial<VitalsValue>) => onChange?.({ ...value, ...patch });
  const num = (raw: string) => (raw === "" ? null : Number(raw));
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">("cm");
  const [feet, setFeet] = useState("");
  const [inches, setInches] = useState("");

  useEffect(() => {
    if (value.height != null && value.height >= 50) {
      const converted = cmToFeetInches(value.height);
      setFeet(String(converted.feet));
      setInches(String(converted.inches));
    } else if (value.height == null) {
      setFeet("");
      setInches("");
    }
  }, [value.height]);

  const bmi = calcBmi(value.weight, value.height);
  const category = bmiLabel(bmi);
  const { errors, warnings } = useMemo(() => validateVitals(value), [value]);

  const applyFeetInches = (nextFeet: string, nextInches: string) => {
    setFeet(nextFeet);
    setInches(nextInches);
    const ft = nextFeet === "" ? null : Number(nextFeet);
    const inch = nextInches === "" ? 0 : Number(nextInches);
    if (ft == null || Number.isNaN(ft)) {
      set({ height: null });
      return;
    }
    set({ height: feetInchesToCm(ft, Number.isNaN(inch) ? 0 : inch) });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label htmlFor="vitals-bp">Blood pressure</Label>
          <Input
            id="vitals-bp"
            readOnly={readOnly}
            value={value.blood_pressure ?? ""}
            onChange={(e) => set({ blood_pressure: e.target.value })}
            placeholder="120/80"
            inputMode="numeric"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="vitals-temp">Temp °C</Label>
          <Input
            id="vitals-temp"
            type="number"
            step="0.1"
            min={34}
            max={43}
            readOnly={readOnly}
            value={value.temperature ?? ""}
            onChange={(e) => set({ temperature: num(e.target.value) })}
            placeholder="36.8"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="vitals-pulse">Pulse / min</Label>
          <Input
            id="vitals-pulse"
            type="number"
            min={30}
            max={220}
            readOnly={readOnly}
            value={value.pulse ?? ""}
            onChange={(e) => set({ pulse: num(e.target.value) })}
            placeholder="72"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="vitals-weight">Weight kg</Label>
          <Input
            id="vitals-weight"
            type="number"
            step="0.1"
            min={2}
            max={400}
            readOnly={readOnly}
            value={value.weight ?? ""}
            onChange={(e) => set({ weight: num(e.target.value) })}
            placeholder="70"
          />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <Label>Height</Label>
            {!readOnly && (
              <select
                className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                value={heightUnit}
                onChange={(e) => setHeightUnit(e.target.value as "cm" | "ft")}
              >
                <option value="cm">cm</option>
                <option value="ft">ft + in</option>
              </select>
            )}
          </div>
          {heightUnit === "cm" || readOnly ? (
            <Input
              id="vitals-height"
              type="number"
              step="0.1"
              min={50}
              max={250}
              readOnly={readOnly}
              value={value.height ?? ""}
              onChange={(e) => set({ height: num(e.target.value) })}
              placeholder="168"
            />
          ) : (
            <div className="flex gap-2">
              <Input
                type="number"
                min={1}
                max={8}
                value={feet}
                onChange={(e) => applyFeetInches(e.target.value, inches)}
                placeholder="5"
                aria-label="Height feet"
              />
              <Input
                type="number"
                min={0}
                max={11}
                value={inches}
                onChange={(e) => applyFeetInches(feet, e.target.value)}
                placeholder="8"
                aria-label="Height inches"
              />
            </div>
          )}
          {!readOnly && heightUnit === "cm" && (
            <p className="text-[11px] text-muted-foreground">Adult height is usually 140–200 cm.</p>
          )}
          {!readOnly &&
            heightUnit === "cm" &&
            value.height != null &&
            value.height > 1 &&
            value.height < 10 && (
              <button
                type="button"
                className="text-left text-[11px] font-medium text-brand-600 hover:underline"
                onClick={() => {
                  const ft = Math.floor(value.height ?? 0);
                  const inch = Math.round(((value.height ?? 0) - ft) * 10);
                  setHeightUnit("ft");
                  applyFeetInches(String(ft), String(inch));
                }}
              >
                {`This looks like feet. Convert ${Math.floor(value.height)} ft ${Math.round((value.height - Math.floor(value.height)) * 10)} in to centimetres?`}
              </button>
            )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="vitals-spo2">SpO2 %</Label>
          <Input
            id="vitals-spo2"
            type="number"
            step="0.1"
            min={50}
            max={100}
            readOnly={readOnly}
            value={value.spo2 ?? ""}
            onChange={(e) => set({ spo2: num(e.target.value) })}
            placeholder="98"
          />
        </div>
        <div className="space-y-1">
          <Label>BMI</Label>
          <div className="flex h-10 items-center rounded-lg border border-dashed border-input bg-muted/40 px-3 text-sm">
            {bmi == null ? "—" : `${bmi} · ${category}`}
          </div>
        </div>
      </div>

      {!readOnly && errors.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {errors.map((msg) => (
            <li key={msg}>{msg}</li>
          ))}
        </ul>
      )}
      {!readOnly && warnings.length > 0 && errors.length === 0 && (
        <ul className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {warnings.map((msg) => (
            <li key={msg}>{msg}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function vitalsBlockers(value: VitalsValue) {
  return validateVitals(value).errors;
}

export function VitalsSummary({ value }: { value: VitalsValue }) {
  const bmi = calcBmi(value.weight, value.height);
  return (
    <p className={cn("text-xs text-muted-foreground")}>
      {[
        value.blood_pressure && `BP ${value.blood_pressure}`,
        value.temperature != null && `${value.temperature}°C`,
        value.pulse != null && `P ${value.pulse}`,
        value.weight != null && `${value.weight} kg`,
        value.height != null && `${value.height} cm`,
        value.spo2 != null && `SpO2 ${value.spo2}%`,
        bmi != null && `BMI ${bmi}`,
      ]
        .filter(Boolean)
        .join(" · ") || "No vitals recorded"}
    </p>
  );
}
