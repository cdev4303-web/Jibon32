import { Measurement, CustomMeasurementField, Language } from '../types';

export interface MeasurementFieldDef {
  key: keyof Measurement | string;
  labelEn: string;
  labelBn: string;
  placeholder?: string;
  type: 'number' | 'text';
}

export const FIELD_DEFINITIONS: Record<string, MeasurementFieldDef> = {
  length: { key: 'length', labelEn: 'Length', labelBn: 'লম্বা (Length)', placeholder: 'e.g. 40', type: 'number' },
  bodyChest: { key: 'bodyChest', labelEn: 'Chest / Bust', labelBn: 'বুক/বডি (Chest)', placeholder: 'e.g. 38', type: 'number' },
  waist: { key: 'waist', labelEn: 'Waist', labelBn: 'কোমর/পেট (Waist)', placeholder: 'e.g. 34', type: 'number' },
  hip: { key: 'hip', labelEn: 'Hip', labelBn: 'হিপ (Hip)', placeholder: 'e.g. 40', type: 'number' },
  shoulder: { key: 'shoulder', labelEn: 'Shoulder', labelBn: 'পুট/কাঁধ (Shoulder)', placeholder: 'e.g. 17.5', type: 'number' },
  sleeve: { key: 'sleeve', labelEn: 'Sleeve', labelBn: 'হাতা (Sleeve)', placeholder: 'e.g. 24', type: 'number' },
  neck: { key: 'neck', labelEn: 'Neck', labelBn: 'গলা (Neck)', placeholder: 'e.g. 15.5', type: 'number' },
  cuff: { key: 'cuff', labelEn: 'Cuff / Mohori', labelBn: 'কাফ/মোহরী (Cuff)', placeholder: 'e.g. 9.5', type: 'number' },
  thigh: { key: 'thigh', labelEn: 'Thigh', labelBn: 'রান/থাই (Thigh)', placeholder: 'e.g. 26', type: 'number' },
  bottom: { key: 'bottom', labelEn: 'Bottom Opening', labelBn: 'পায়ের মোহরী (Bottom)', placeholder: 'e.g. 14', type: 'number' },
  inseam: { key: 'inseam', labelEn: 'Inseam / High', labelBn: 'ইনসিম/হাই (Inseam)', placeholder: 'e.g. 30', type: 'number' },
  flareBottom: { key: 'flareBottom', labelEn: 'Flare / Gher', labelBn: 'ঘের (Bottom Flare)', placeholder: 'e.g. 70', type: 'number' },
  collar: { key: 'collar', labelEn: 'Collar Type', labelBn: 'কলার ধরণ (Collar Type)', placeholder: 'e.g. Band / Regular', type: 'text' },
};

export const STANDARD_MEASUREMENT_TYPES = [
  'Panjabi',
  'Shirt',
  'Pant',
  'Pajama',
  'Kurta',
  'Suit',
  'Blazer',
  'Abaya',
  'Borka',
  'Salwar',
  'Kameez',
  'Other',
];

export const GARMENT_FIELD_MAP: Record<string, string[]> = {
  panjabi: ['length', 'bodyChest', 'waist', 'shoulder', 'sleeve', 'neck', 'cuff', 'collar', 'flareBottom'],
  shirt: ['length', 'bodyChest', 'waist', 'shoulder', 'sleeve', 'neck', 'cuff', 'collar'],
  pant: ['length', 'waist', 'hip', 'thigh', 'bottom', 'inseam'],
  pajama: ['length', 'waist', 'hip', 'thigh', 'bottom'],
  kurta: ['length', 'bodyChest', 'waist', 'hip', 'shoulder', 'sleeve', 'neck', 'cuff'],
  suit: ['length', 'bodyChest', 'waist', 'hip', 'shoulder', 'sleeve', 'neck', 'inseam'],
  blazer: ['length', 'bodyChest', 'waist', 'shoulder', 'sleeve', 'neck'],
  abaya: ['length', 'bodyChest', 'waist', 'hip', 'shoulder', 'sleeve', 'neck', 'flareBottom'],
  borka: ['length', 'bodyChest', 'waist', 'hip', 'shoulder', 'sleeve', 'neck', 'flareBottom'],
  salwar: ['length', 'waist', 'hip', 'thigh', 'bottom'],
  kameez: ['length', 'bodyChest', 'waist', 'hip', 'shoulder', 'sleeve', 'neck', 'flareBottom'],
  other: ['length', 'bodyChest', 'waist', 'hip', 'shoulder', 'sleeve', 'neck', 'cuff', 'thigh', 'bottom', 'inseam', 'flareBottom'],
};

/**
 * Returns field keys that are most relevant for a given dress type.
 */
export function getFieldsForDressType(dressType: string): string[] {
  const norm = dressType.toLowerCase().trim();
  for (const [key, fields] of Object.entries(GARMENT_FIELD_MAP)) {
    if (norm.includes(key)) {
      return fields;
    }
  }
  return GARMENT_FIELD_MAP.other;
}

/**
 * Creates an independent deep-copy snapshot of a measurement.
 * This guarantees that modifying the original profile later will NEVER affect old orders/invoices.
 */
export function cloneMeasurementSnapshot(
  m: Measurement | Partial<Measurement>,
  overrides?: Partial<Measurement> | string
): Measurement {
  const ovObj: Partial<Measurement> = typeof overrides === 'string' ? { invoiceId: overrides } : (overrides || {});
  return {
    id: ovObj.id || `meas-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    invoiceId: ovObj.invoiceId ?? m.invoiceId,
    customerName: ovObj.customerName ?? m.customerName ?? '',
    customerPhone: ovObj.customerPhone ?? m.customerPhone ?? '',
    customerAddress: ovObj.customerAddress ?? m.customerAddress,
    profileName: ovObj.profileName ?? m.profileName,
    dressType: ovObj.dressType ?? m.dressType ?? 'Panjabi',
    isDefault: ovObj.isDefault ?? m.isDefault,
    length: ovObj.length ?? m.length ?? 0,
    bodyChest: ovObj.bodyChest ?? m.bodyChest ?? 0,
    waist: ovObj.waist ?? m.waist ?? 0,
    hip: ovObj.hip ?? m.hip ?? 0,
    shoulder: ovObj.shoulder ?? m.shoulder ?? 0,
    sleeve: ovObj.sleeve ?? m.sleeve ?? 0,
    neck: ovObj.neck ?? m.neck ?? 0,
    flareBottom: ovObj.flareBottom ?? m.flareBottom ?? 0,
    cuff: ovObj.cuff ?? m.cuff,
    thigh: ovObj.thigh ?? m.thigh,
    bottom: ovObj.bottom ?? m.bottom,
    inseam: ovObj.inseam ?? m.inseam,
    collar: ovObj.collar ?? m.collar,
    customFields: m.customFields ? JSON.parse(JSON.stringify(m.customFields)) : [],
    unit: ovObj.unit ?? m.unit ?? 'inches',
    designNotes: ovObj.designNotes ?? m.designNotes ?? '',
    specialInstructions: ovObj.specialInstructions ?? m.specialInstructions ?? '',
    createdAt: ovObj.createdAt ?? m.createdAt ?? Date.now(),
    updatedAt: ovObj.updatedAt ?? Date.now(),
  };
}

/**
 * Filter all measurement profiles belonging to a specific customer
 * matches by normalized phone number or customer name.
 */
export function getCustomerMeasurementProfiles(
  measurements: Measurement[],
  customerPhone?: string,
  customerName?: string
): Measurement[] {
  const normPhone = (customerPhone || '').replace(/\D/g, '').trim();
  const normName = (customerName || '').toLowerCase().trim();

  if (!normPhone && !normName) return [];

  return measurements.filter((m) => {
    const mPhone = (m.customerPhone || '').replace(/\D/g, '').trim();
    const mName = (m.customerName || '').toLowerCase().trim();

    if (normPhone && mPhone && (mPhone === normPhone || mPhone.endsWith(normPhone) || normPhone.endsWith(mPhone))) {
      return true;
    }
    if (normName && mName && mName === normName) {
      return true;
    }
    return false;
  });
}

/**
 * Find default profile for customer or match by dress type
 */
export function getSuggestedCustomerMeasurement(
  customerProfiles: Measurement[],
  preferredDressType?: string
): Measurement | undefined {
  if (!customerProfiles.length) return undefined;

  // 1. If preferred dressType requested, check default of that dressType
  if (preferredDressType) {
    const normType = preferredDressType.toLowerCase().trim();
    const exactMatch = customerProfiles.find(
      (p) => p.dressType.toLowerCase().trim() === normType && p.isDefault
    );
    if (exactMatch) return exactMatch;

    const anyDressMatch = customerProfiles.find(
      (p) => p.dressType.toLowerCase().trim() === normType
    );
    if (anyDressMatch) return anyDressMatch;
  }

  // 2. Any default profile marked by user
  const globalDefault = customerProfiles.find((p) => p.isDefault);
  if (globalDefault) return globalDefault;

  // 3. Fallback to newest profile
  return customerProfiles[0];
}

/**
 * Generates human readable display title for a profile
 */
export function getMeasurementProfileTitle(m: Measurement): string {
  if (m.profileName && m.profileName.trim()) {
    return m.profileName.trim();
  }
  return `${m.dressType || 'Tailoring'} Profile`;
}

/**
 * Formats a measurement profile as clean multi-line text for clipboard or sharing
 */
export function formatMeasurementShareText(
  m: Measurement,
  shopName: string,
  lang: Language | string = 'BN'
): string {
  const isEn = lang === 'EN';
  const title = getMeasurementProfileTitle(m);
  const relevantFields = getFieldsForDressType(m.dressType);
  const dateStr = m.updatedAt ? new Date(m.updatedAt).toLocaleDateString() : '';

  const lines: string[] = [
    `📏 *${isEn ? 'Measurement Profile' : 'পরিমাপ প্রোফাইল'}: ${title}*`,
    `👤 *${isEn ? 'Customer' : 'কাস্টমার'}*: ${m.customerName} (${m.customerPhone})`,
    `👗 *${isEn ? 'Type' : 'পোশাক'}*: ${m.dressType}`,
    dateStr ? `📅 *${isEn ? 'Date' : 'তারিখ'}*: ${dateStr}` : '',
    '-------------------------',
  ].filter(Boolean);

  relevantFields.forEach((fKey) => {
    const def = FIELD_DEFINITIONS[fKey];
    const val = (m as any)[fKey];
    if (val !== undefined && val !== null && val !== 0 && val !== '') {
      lines.push(`• ${isEn ? def.labelEn : def.labelBn}: *${val}* ${m.unit || 'inches'}`);
    }
  });

  if (m.customFields && m.customFields.length > 0) {
    m.customFields.forEach((cf) => {
      if (cf.name && cf.value) {
        lines.push(`• ${cf.name}: *${cf.value}*`);
      }
    });
  }

  if (m.designNotes) {
    lines.push(`📝 *${isEn ? 'Notes' : 'ডিজাইন নোট'}*: ${m.designNotes}`);
  }
  if (m.specialInstructions) {
    lines.push(`✂️ *${isEn ? 'Special Instructions' : 'বিশেষ নির্দেশ'}*: ${m.specialInstructions}`);
  }

  lines.push(`\n🏢 *${shopName}*`);
  return lines.join('\n');
}
