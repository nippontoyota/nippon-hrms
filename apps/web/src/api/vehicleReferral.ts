import { publicSupabase } from '@/lib/supabase';
import { normalizePhone } from '@/lib/phone';

export interface VehicleReferralInput {
  customerName: string;
  employeeId: string;
  referredName: string;
  referredPhone: string;
  model: 'glanza' | 'hyryder';
  website?: string;
}

export class VehicleReferralError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VehicleReferralError';
  }
}

function mapInsertError(error: { code?: string; message?: string }): never {
  const code = error.code ?? '';
  const message = error.message ?? '';

  if (code === '23505' || /duplicate|unique/i.test(message)) {
    throw new VehicleReferralError('This person has already been referred');
  }
  throw new VehicleReferralError('Could not submit. Please try again.');
}

export const vehicleReferralApi = {
  async submit(data: VehicleReferralInput) {
    if (data.website?.trim()) return;

    const customerName = data.customerName.trim();
    const employeeId = data.employeeId.trim();
    const referredName = data.referredName.trim();
    const referredPhone = normalizePhone(data.referredPhone);

    if (customerName.length < 2 || employeeId.length < 1 || referredName.length < 2 || !referredPhone) {
      throw new VehicleReferralError('Please check the submitted details');
    }

    const { error } = await publicSupabase.from('vehicle_referrals').insert({
      customer_name: customerName,
      employee_id: employeeId,
      referred_name: referredName,
      referred_phone: referredPhone,
      model: data.model,
    });

    if (error) mapInsertError(error);
  },
};
