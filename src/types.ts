export interface UpdateConfig {
  update_all: boolean;
  replace_code: boolean;
  harga_max: boolean;
  auto_save: boolean;
  multi_service: boolean;
  allow_invoice: boolean;
  only_warning: boolean;
  rating: string;
}

export interface DigiflazzAccount {
  balance: number;
  seller_name?: string;
  deposit_balance?: number;
  account_id?: string;
  raw_response?: any;
}

export interface LicenseStatus {
  key: string;
  checked: boolean;
  valid: boolean;
  status: "active" | "unused" | "expired" | "unknown";
  message: string;
  deviceId?: string;
}
