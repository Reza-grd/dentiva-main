import { get, set, update, del, keys } from 'idb-keyval';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export const OFFLINE_QUEUE_KEY = 'dentiva_offline_queue';
export const EMR_DRAFT_KEY_PREFIX = 'emr_draft_';

/**
 * Adds an operation to the offline queue
 */
export const addToOfflineQueue = async (operation) => {
  const queueItem = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    status: 'pending', // pending, syncing, completed, failed
    ...operation
  };

  await update(OFFLINE_QUEUE_KEY, (val) => {
    const queue = val || [];
    return [...queue, queueItem];
  });
  
  if (!navigator.onLine) {
    toast.success('Disimpan secara offline. Akan disinkronisasi saat terhubung ke internet.');
  }
};

/**
 * Process the offline queue when online
 */
export const processOfflineQueue = async () => {
  if (!navigator.onLine) return;

  const queue = await get(OFFLINE_QUEUE_KEY) || [];
  const pendingItems = queue.filter(item => item.status === 'pending' || item.status === 'failed');

  if (pendingItems.length === 0) return;

  console.log(`[OfflineSync] Processing ${pendingItems.length} items in queue...`);

  let newQueue = [...queue];

  for (const item of pendingItems) {
    try {
      // Mark as syncing
      const itemIndex = newQueue.findIndex(q => q.id === item.id);
      newQueue[itemIndex].status = 'syncing';
      await set(OFFLINE_QUEUE_KEY, newQueue);

      // Execute based on table/action
      if (item.action === 'INSERT') {
        const { error } = await supabase.from(item.table).insert(item.payload);
        if (error) throw error;
      } else if (item.action === 'UPDATE') {
        // Here we could implement Conflict Resolution logic for EMR/Odontogram
        if (item.table === 'visits' && item.type === 'emr') {
          // Manual Merge logic check could go here if server version > client version
        }
        
        const { error } = await supabase.from(item.table).update(item.payload).eq('id', item.recordId);
        if (error) throw error;
      }

      // Mark completed
      newQueue[itemIndex].status = 'completed';
    } catch (err) {
      console.error(`[OfflineSync] Failed to process item ${item.id}`, err);
      const itemIndex = newQueue.findIndex(q => q.id === item.id);
      newQueue[itemIndex].status = 'failed';
      newQueue[itemIndex].error = err.message;
    }
  }

  // Cleanup completed items
  newQueue = newQueue.filter(q => q.status !== 'completed');
  await set(OFFLINE_QUEUE_KEY, newQueue);
  
  if (pendingItems.length > 0) {
    toast.success('Sinkronisasi data offline selesai.');
  }
};

// Setup network listener
if (typeof window !== 'undefined') {
  window.addEventListener('online', processOfflineQueue);
}

// Auto-save drafts
export const saveDraft = async (id, data) => {
  await set(`${EMR_DRAFT_KEY_PREFIX}${id}`, {
    ...data,
    saved_at: new Date().toISOString()
  });
};

export const getDraft = async (id) => {
  return await get(`${EMR_DRAFT_KEY_PREFIX}${id}`);
};
