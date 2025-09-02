import axios from './axios';

export async function getStats(params) {
  const { data } = await axios.get('/api/stats', { params });
  return data.data || {};
}

export async function getCallDetail(id) {
  const { data } = await axios.get(`/api/calls/records/${id}`);
  console.log('getCallDetail data',data)
  return data.data;
}

export async function getRecords(params) {
  const { data } = await axios.get('/api/calls/records', { params });
    console.log('getRecords data',data)
  return data;
}

export async function exportRecords(filters, fmt = 'csv') {
  const params = { ...filters, fmt };
  const response = await axios.get('/api/calls/export', {
    params,
    responseType: 'blob', 
  });
  return response.data;
}
