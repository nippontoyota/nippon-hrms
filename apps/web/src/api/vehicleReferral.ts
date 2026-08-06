import { publicSupabase } from '@/lib/supabase';
import { normalizePhone } from '@/lib/phone';

export interface VehicleReferralFriend {
  referredName: string;
  referredPhone: string;
  model: 'glanza' | 'hyryder';
}

export interface VehicleReferralInput {
  customerName: string;
  employeeId: string;
  friends: VehicleReferralFriend[];
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
    throw new VehicleReferralError('One of these people has already been referred');
  }
  throw new VehicleReferralError('Could not submit. Please try again.');
}

export const vehicleReferralApi = {
  async submit(data: VehicleReferralInput) {
    if (data.website?.trim()) return;

    const customerName = data.customerName.trim();
    const employeeId = data.employeeId.trim();
    if (customerName.length < 2 || employeeId.length < 1 || data.friends.length < 1) {
      throw new VehicleReferralError('Please check the submitted details');
    }

    const rows: {
      customer_name: string;
      employee_id: string;
      referred_name: string;
      referred_phone: string;
      model: 'glanza' | 'hyryder';
    }[] = [];
    const seen = new Set<string>();

    for (const friend of data.friends) {
      const referredName = friend.referredName.trim();
      const referredPhone = normalizePhone(friend.referredPhone);
      if (referredName.length < 2 || !referredPhone) {
        throw new VehicleReferralError('Please check the submitted details');
      }
      if (friend.model !== 'glanza' && friend.model !== 'hyryder') {
        throw new VehicleReferralError('Please check the submitted details');
      }
      if (seen.has(referredPhone)) {
        throw new VehicleReferralError('Each referred person must have a different mobile number');
      }
      seen.add(referredPhone);
      rows.push({
        customer_name: customerName,
        employee_id: employeeId,
        referred_name: referredName,
        referred_phone: referredPhone,
        model: friend.model,
      });
    }

    const { error } = await publicSupabase.from('vehicle_referrals').insert(rows);
    if (error) mapInsertError(error);
  },
};
