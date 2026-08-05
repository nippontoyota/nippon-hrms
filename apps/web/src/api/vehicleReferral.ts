import axios from 'axios';

const publicApi = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

export interface VehicleReferralInput {
  customerName: string;
  customerPhone: string;
  referredName: string;
  referredPhone: string;
  model: 'glanza' | 'hyryder';
  website?: string;
}

export const vehicleReferralApi = {
  submit: (data: VehicleReferralInput) =>
    publicApi.post('/vehicle-referrals', data).then((res) => res.data),
};
