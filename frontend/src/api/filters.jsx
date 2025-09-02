import axios from './axios';

export async function getCampaigns({
  search = '',
  page = 1,
  limit = 1000,
  all = false,
  selected = []
} = {}) {
  const params = { search, page, limit, all };
  
  if (selected.length) {
    params.selected = selected.join(',');
  }

  const { data } = await axios.get('/api/filters/campaigns', { params });
  return data.campaigns || [];
}

export async function getPublishers({
  search = '',
  page = 1,
  limit = 1000,
  all = false,
  selected = []
} = {}) {
  const params = { search, page, limit, all };

  if (selected.length) {
    params.selected = selected.join(',');
  }

  const { data } = await axios.get('/api/filters/publishers', { params });
  return data.publishers || [];
}

export async function getFiltersAll() {
  const { data } = await axios.get('/api/filters/all');
  return data;
}
