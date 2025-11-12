const axios = require('axios');

const RINGBA_TOKEN = process.env.RINGBA_API_KEY;
const ACCOUNT_ID = process.env.RINGBA_ACCOUNT_ID;

const fetchCapsFromRingba = async () => {
  const { data } = await axios.get(`https://api.ringba.com/v2/${ACCOUNT_ID}/targets`, {
    headers: { Authorization: `Token ${RINGBA_TOKEN}` },
  });

  if (!data?.targets?.length) {
    console.warn("No targets returned from Ringba");
    return [];
  }
  const mappedTargets = data.targets.map(t => ({
    name: t.name || '',
    number: Array.isArray(t.instructions)
      ? t.instructions[0]?.number || ''
      : t.instructions?.number || '',
    concurrencyCap: t.schedule?.concurrencyCap ?? -1,
    hourlyCap: t.schedule?.hourlyCap ?? -1,
    dailyCap: t.schedule?.dailyCap ?? -1,
    monthlyCap: t.schedule?.monthlyCap ?? -1,
    allTimeCap: t.schedule?.allTimeCap ?? -1,
    enabled: !!t.enabled, 
  }));

  console.log("Mapped targets count:", mappedTargets.length);
  return mappedTargets;
};

module.exports = { fetchCapsFromRingba };
