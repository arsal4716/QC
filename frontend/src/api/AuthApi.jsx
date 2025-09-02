// AuthApi.js
import axios from './axios'; 

export async function register(params) {
  const { data } = await axios.post('/api/auth/register', params);
  console.log('register data', data);
  return data; 
}

export async function login(params) {
  const { data } = await axios.post('/api/auth/login', params);
  console.log('login data', data);
  return data; 
}

export async function users(params) {
  const { data } = await axios.get('/api/user', { params });
  return data;
}
