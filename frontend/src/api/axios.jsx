import axios from 'axios';

const instance = axios.create({
  baseURL: process.env.REACT_APP_API_BASE || '',
  timeout: 120000,
  withCredentials: true
});

export default instance;
