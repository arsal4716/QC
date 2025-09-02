import axios from './axios';

export async function getUsers() {
  const { data } = await axios.get('/api/users');
  return data.users || [];
}

export async function getUserById(id) {
  const { data } = await axios.get(`/api/users/${id}`);
  return data.user;
}

export async function createUser(userData) {
  const { data } = await axios.post('/api/users', userData);
  return data.user;
}

export async function updateUser(id, userData) {
  const { data } = await axios.put(`/api/users/${id}`, userData);
  return data.user;
}

export async function deleteUser(id) {
  const { data } = await axios.delete(`/api/users/${id}`);
  return data;
}