const url = 'https://luxius-backend.onrender.com/api/orders';

fetch(url)
  .then(r => r.json())
  .then(async (orders) => {
    console.log(`Found ${orders.length} orders on Render.`);
    const seen = new Set();
    const toDelete = [];

    // Reverse orders to keep the first (oldest) one, and delete subsequent identical ones
    orders.reverse();

    for (const o of orders) {
      // Create a unique hash based on details to find duplicates
      const hash = `${o.cliente}|${o.fecha}|${o.total}`;
      if (seen.has(hash)) {
        toDelete.push(o.id);
      } else {
        seen.add(hash);
      }
    }

    console.log(`Found ${toDelete.length} duplicates to delete.`);
    
    // Delete duplicates in chunks of 50
    const chunkSize = 50;
    for (let i = 0; i < toDelete.length; i += chunkSize) {
      const chunk = toDelete.slice(i, i + chunkSize);
      const res = await fetch(url + '/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', ids: chunk })
      });
      console.log(`Batch delete chunk ${i/chunkSize + 1}: ${res.status}`);
    }
    console.log('Done!');
  })
  .catch(console.error);
