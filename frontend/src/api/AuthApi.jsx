// AuthApi.js
import axios from './axios'; 
export async function register(params) {
  const { data } = await axios.post('/api/auth/register', params);
  return data.data || {};
}

export async function login(params) {
  const { data } = await axios.post('/api/auth/login', params);
  return data;
}

export async function users(params) {
  const { data } = await axios.get('/api/user', { params });
  return data.data || {};
}
