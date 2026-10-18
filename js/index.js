document.addEventListener('DOMContentLoaded', async () => {
  try {
    const result = await gmDB.test();
    console.log('[db] connection established:', result.data);
  } catch (err) {
    console.error('[db] connection failed:', err.message);
  }
});
