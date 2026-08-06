import { supabase } from '@/lib/supabase';

export interface VehicleReferralInput {
  customerName: string;
  employeeId: string;
  referredName: string;
  referredPhone: string;
  model: 'glanza' | 'hyryder';
  website?: string;
}

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  const local =
    digits.length === 12 && digits.startsWith('91')
      ? digits.slice(2)
      : digits.length === 11 && digits.startsWith('0')
        ? digits.slice(1)
        : digits;
  return /^[6-9]\d{9}$/.test(local) ? `+91${local}` : null;
}

export const vehicleReferralApi = {
  async submit(data: VehicleReferralInput) {
    if (data.website?.trim()) return;

    const customerName = data.customerName.trim();
    const employeeId = data.employeeId.trim();
    const referredName = data.referredName.trim();
    const referredPhone = normalizePhone(data.referredPhone);

    if (customerName.length < 2 || employeeId.length < 1 || referredName.length < 2 || !referredPhone) {
      throw new Error('invalid');
    }

    const { error } = await supabase.from('vehicle_referrals').insert({
      customer_name: customerName,
      employee_id: employeeId,
      referred_name: referredName,
      referred_phone: referredPhone,
      model: data.model,
    });

    if (error) throw error;
  },
};
