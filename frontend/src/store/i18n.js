// src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLanguage, setLanguage } from '../api/indexedDB';

// Импортируем файлы переводов
import ruTranslation from '../locales/ru.json';
import enTranslation from '../locales/en.json';

// Синхронная инициализация с языком по умолчанию
i18n
  .use(initReactI18next)
  .init({
    resources: {
      ru: { translation: ruTranslation },
      en: { translation: enTranslation }
    },
    lng: 'ru', // Временный язык по умолчанию
    fallbackLng: 'ru',
    debug: process.env.NODE_ENV === 'development',
    interpolation: {
      escapeValue: false,
    },
  });

// Асинхронно загружаем сохраненный язык и меняем его
(async () => {
  try {
    const savedLanguage = await getLanguage();
    console.log('Loaded language from IndexedDB:', savedLanguage);
    if (savedLanguage && savedLanguage !== 'ru') {
      await i18n.changeLanguage(savedLanguage);
    }
  } catch (error) {
    console.error('Error loading language:', error);
  }
})();

// Слушаем событие смены языка
i18n.on('languageChanged', async (lng) => {
  try {
    await setLanguage(lng);
    console.log(`Language saved to IndexedDB: ${lng}`);
  } catch (error) {
    console.error('Error saving language to IndexedDB:', error);
  }
});

export default i18n;