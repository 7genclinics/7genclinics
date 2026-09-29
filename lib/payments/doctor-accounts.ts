import type { PaymentAccountDetails, BookablePaymentMethod } from "@/lib/payment/config";

export interface DoctorReceivingSettings {
  accountTitle: string;
  jazzcash: string;
  easypaisa: string;
  bankName: string;
  accountNumber: string;
  iban: string;
}

type StoredPayout = Partial<DoctorReceivingSettings> & {
  method?: "bank" | "easypaisa" | "jazzcash";
  walletNumber?: string;
};

export function emptyDoctorReceivingSettings(): DoctorReceivingSettings {
  return {
    accountTitle: "",
    jazzcash: "",
    easypaisa: "",
    bankName: "",
    accountNumber: "",
    iban: "",
  };
}

export function parseDoctorReceivingSettings(raw: unknown): DoctorReceivingSettings {
  const settings = emptyDoctorReceivingSettings();
  if (!raw || typeof raw !== "object") return settings;
  const stored = raw as StoredPayout;
  settings.accountTitle = stored.accountTitle?.trim() ?? "";
  settings.jazzcash = stored.jazzcash?.trim() ?? "";
  settings.easypaisa = stored.easypaisa?.trim() ?? "";
  settings.bankName = stored.bankName?.trim() ?? "";
  settings.accountNumber = stored.accountNumber?.trim() ?? "";
  settings.iban = stored.iban?.trim() ?? "";
  const wallet = stored.walletNumber?.trim() ?? "";
  if (stored.method === "jazzcash" && wallet && !settings.jazzcash) settings.jazzcash = wallet;
  if (stored.method === "easypaisa" && wallet && !settings.easypaisa) settings.easypaisa = wallet;
  return settings;
}

export function doctorHasReceivingAccount(settings: DoctorReceivingSettings) {
  return Boolean(settings.jazzcash || settings.easypaisa || settings.iban || settings.accountNumber);
}

export function doctorReceivingAccounts(
  settings: DoctorReceivingSettings,
  doctorName: string
): PaymentAccountDetails[] {
  const title = settings.accountTitle.trim() || doctorName || "Doctor";
  const accounts: PaymentAccountDetails[] = [];

  if (settings.jazzcash) {
    accounts.push({
      label: "JazzCash",
      method: "jazzcash",
      accountTitle: title,
      accountNumber: settings.jazzcash,
      instructions:
        "Open JazzCash → Send Money → Mobile Account → enter this number → send the exact consultation fee → screenshot the confirmation.",
    });
  }
  if (settings.easypaisa) {
    accounts.push({
      label: "EasyPaisa",
      method: "easypaisa",
      accountTitle: title,
      accountNumber: settings.easypaisa,
      instructions:
        "Open EasyPaisa → Send Money → Mobile Account → enter this number → send the exact consultation fee → screenshot the confirmation.",
    });
  }
  const bankNumber = settings.iban || settings.accountNumber;
  if (bankNumber) {
    accounts.push({
      label: "Bank Transfer",
      method: "bank_transfer",
      accountTitle: title,
      accountNumber: bankNumber,
      bankName: settings.bankName || null,
      iban: settings.iban || null,
      instructions:
        "Transfer the exact consultation fee to this doctor account. Upload a screenshot or PDF of the transfer receipt.",
    });
  }
  return accounts;
}

export function isBookableDoctorMethod(method: string): method is BookablePaymentMethod {
  return method === "jazzcash" || method === "easypaisa" || method === "bank_transfer";
}
