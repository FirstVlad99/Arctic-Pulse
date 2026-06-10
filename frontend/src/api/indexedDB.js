// src/utils/indexedDB.js
import { openDB } from 'idb';

const DB_NAME = 'ArcticNewsDB';
const DB_VERSION = 5;

// Инициализация базы данных
export const initDB = async () => {
  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      console.log(`Upgrading DB from version ${oldVersion} to ${newVersion}`);
      
      // Хранилище для голосов пользователя
      if (!db.objectStoreNames.contains('userVotes')) {
        const voteStore = db.createObjectStore('userVotes', { keyPath: 'newsId' });
        voteStore.createIndex('voteType', 'voteType');
        voteStore.createIndex('timestamp', 'timestamp');
      }
      
      // Хранилище для языка
      if (!db.objectStoreNames.contains('language')) {
        db.createObjectStore('language', { keyPath: 'id' });
      }
      
      // Хранилище для статусов источников
      if (!db.objectStoreNames.contains('sourceStatuses')) {
        const sourceStore = db.createObjectStore('sourceStatuses', { keyPath: 'id' });
        sourceStore.createIndex('status', 'status');
        sourceStore.createIndex('updatedAt', 'updatedAt');
      }
      
      // Хранилище для кэша актуальности источников
      if (!db.objectStoreNames.contains('sourceRelevanceCache')) {
        const relevanceStore = db.createObjectStore('sourceRelevanceCache', { keyPath: 'id' });
        relevanceStore.createIndex('isRelevant', 'isRelevant');
        relevanceStore.createIndex('lastChecked', 'lastChecked');
      }
    },
  });
  return db;
};

// ========== Работа с голосами ==========

export const hasVoted = async (newsId) => {
  try {
    const db = await initDB();
    const vote = await db.get('userVotes', newsId);
    return !!vote;
  } catch (error) {
    console.error('Error checking vote:', error);
    return false;
  }
};

export const getVoteType = async (newsId) => {
  try {
    const db = await initDB();
    const vote = await db.get('userVotes', newsId);
    return vote?.voteType || null;
  } catch (error) {
    console.error('Error getting vote type:', error);
    return null;
  }
};

export const registerVote = async (newsId, voteType) => {
  try {
    const db = await initDB();
    await db.put('userVotes', { 
      newsId, 
      voteType, 
      timestamp: Date.now() 
    });
    return true;
  } catch (error) {
    console.error('Error registering vote:', error);
    return false;
  }
};

export const removeVote = async (newsId) => {
  try {
    const db = await initDB();
    await db.delete('userVotes', newsId);
    return true;
  } catch (error) {
    console.error('Error removing vote:', error);
    return false;
  }
};

export const getAllVotes = async () => {
  try {
    const db = await initDB();
    return await db.getAll('userVotes');
  } catch (error) {
    console.error('Error getting all votes:', error);
    return [];
  }
};

export const clearAllVotes = async () => {
  try {
    const db = await initDB();
    await db.clear('userVotes');
    return true;
  } catch (error) {
    console.error('Error clearing votes:', error);
    return false;
  }
};

// ========== Работа с языком ==========

export const setLanguage = async (language) => {
  try {
    const db = await initDB();
    await db.put('language', { id: 'current', value: language });
    return true;
  } catch (error) {
    console.error('Error saving language:', error);
    return false;
  }
};

export const getLanguage = async () => {
  try {
    const db = await initDB();
    const result = await db.get('language', 'current');
    return result?.value || 'ru';
  } catch (error) {
    console.error('Error getting language:', error);
    return 'ru';
  }
};

// ========== Работа со статусами источников ==========

export const saveSourceStatus = async (sourceId, status) => {
  try {
    const db = await initDB();
    await db.put('sourceStatuses', { 
      id: sourceId, 
      status, 
      updatedAt: Date.now() 
    });
    return true;
  } catch (error) {
    console.error('Error saving source status:', error);
    return false;
  }
};

export const getSourceStatus = async (sourceId) => {
  try {
    const db = await initDB();
    const result = await db.get('sourceStatuses', sourceId);
    return result?.status || null;
  } catch (error) {
    console.error('Error getting source status:', error);
    return null;
  }
};

export const getAllSourceStatuses = async () => {
  try {
    const db = await initDB();
    return await db.getAll('sourceStatuses');
  } catch (error) {
    console.error('Error getting all source statuses:', error);
    return [];
  }
};

export const syncSourceStatuses = async (initialSources) => {
  try {
    const savedStatuses = await getAllSourceStatuses();
    const savedIds = savedStatuses.map(s => s.id);
    const initialIds = initialSources.map(s => s.id);
    
    for (const savedId of savedIds) {
      if (!initialIds.includes(savedId)) {
        await removeSourceStatus(savedId);
      }
    }
    
    for (const source of initialSources) {
      if (!savedIds.includes(source.id)) {
        await saveSourceStatus(source.id, source.status || 'active');
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error syncing source statuses:', error);
    return false;
  }
};

export const removeSourceStatus = async (sourceId) => {
  try {
    const db = await initDB();
    await db.delete('sourceStatuses', sourceId);
    return true;
  } catch (error) {
    console.error('Error removing source status:', error);
    return false;
  }
};

// ========== Работа с кэшем актуальности источников ==========

// Сохранение кэша актуальности одного источника
export const cacheSourceRelevance = async (sourceId, isRelevant) => {
  try {
    const db = await initDB();
    await db.put('sourceRelevanceCache', { 
      id: sourceId, 
      isRelevant, 
      lastChecked: Date.now() 
    });
    return true;
  } catch (error) {
    console.error('Error caching source relevance:', error);
    return false;
  }
};

// Массовое сохранение кэша актуальности (нужная функция)
export const cacheMultipleSourcesRelevance = async (sourcesRelevance) => {
  try {
    const db = await initDB();
    const tx = db.transaction('sourceRelevanceCache', 'readwrite');
    const store = tx.objectStore('sourceRelevanceCache');
    
    for (const { id, isRelevant } of sourcesRelevance) {
      await store.put({ 
        id, 
        isRelevant, 
        lastChecked: Date.now() 
      });
    }
    
    await tx.done;
    return true;
  } catch (error) {
    console.error('Error caching multiple sources relevance:', error);
    return false;
  }
};

// Получение кэша актуальности источника
export const getCachedSourceRelevance = async (sourceId) => {
  try {
    const db = await initDB();
    const result = await db.get('sourceRelevanceCache', sourceId);
    return result?.isRelevant ?? null;
  } catch (error) {
    console.error('Error getting cached source relevance:', error);
    return null;
  }
};

// Получение всего кэша актуальности
export const getAllCachedRelevance = async () => {
  try {
    const db = await initDB();
    return await db.getAll('sourceRelevanceCache');
  } catch (error) {
    console.error('Error getting all cached relevance:', error);
    return [];
  }
};

// Очистка кэша актуальности
export const clearRelevanceCache = async () => {
  try {
    const db = await initDB();
    await db.clear('sourceRelevanceCache');
    return true;
  } catch (error) {
    console.error('Error clearing relevance cache:', error);
    return false;
  }
};

// ========== Полная очистка ==========

export const clearAllData = async () => {
  try {
    const db = await initDB();
    await db.clear('userVotes');
    await db.clear('language');
    await db.clear('sourceStatuses');
    await db.clear('sourceRelevanceCache');
    return true;
  } catch (error) {
    console.error('Error clearing all data:', error);
    return false;
  }
};