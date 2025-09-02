import axios from './axios';

export async function getCostStats() {
  try {
    const { data } = await axios.get('/api/cost/stats');
    return data;
  } catch (error) {
    console.error('Error fetching cost stats:', error);
    throw error;
  }
}

export async function getPaymentHistory() {
  try {
    const { data } = await axios.get('/api/cost/payments');
    return data.payments || [];
  } catch (error) {
    console.error('Error fetching payment history:', error);
    throw error;
  }
}