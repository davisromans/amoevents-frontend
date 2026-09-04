import axios from 'axios';

export async function fetchPublicPricing() {
  const { data } = await axios.get('/api/public/pricing');
  return data.data;
}
