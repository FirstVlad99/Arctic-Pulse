-- Таблица с источниками новостей
CREATE TABLE sources(
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    rss_url TEXT NOT NULL,
    website_url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_fetched TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NSIDC
INSERT INTO sources (name, rss_url, website_url, is_active) 
VALUES ('NSIDC News', 'https://nsidc.org/news/feed', 'https://nsidc.org', true);
-- Arctic Research
INSERT INTO sources (name, rss_url, website_url, is_active) 
VALUES ('Arctic Research', 'https://arcticresearch.wordpress.com/feed/', 'https://arcticresearch.wordpress.com', true);
-- Great White Con
INSERT INTO sources (name, rss_url, website_url, is_active) 
VALUES ('Great White Con', 'https://greatwhitecon.info/blog/feed/', 'https://greatwhitecon.info', true);
-- Arctic Economic Council
INSERT INTO sources (name, rss_url, website_url, is_active) 
VALUES ('Arctic Economic Council', 'https://arcticeconomiccouncil.com/feed/', 'https://arcticeconomiccouncil.com', true);
-- The Arctic Institute
INSERT INTO sources (name, rss_url, website_url, is_active) 
VALUES ('The Arctic Institute', 'https://www.thearcticinstitute.org/feed/', 'https://www.thearcticinstitute.org', true);

-- Таблица с новостями
CREATE TABLE news (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title TEXT NOT NULL,
    -- Уникальный идентификатор для URL
    slug TEXT GENERATED ALWAYS AS (LOWER(REPLACE(title, ' ', '-'))) STORED,
    -- Полный текст новости в HTML
    content TEXT NOT NULL,
    -- Без HTML
    content_clean TEXT NOT NULL,
    news_url TEXT NOT NULL,
    publication_date TIMESTAMPTZ NOT NULL,
    material_author TEXT NOT NULL,
    source_id INT NOT NULL REFERENCES sources(id),
    summary_ai TEXT,
    tokens_used INT,
    -- Время обработки в секундах
    processing_time  DECIMAL(10, 2),
    -- Дата и время обработки нейросетью
    processed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица тэгов
CREATE TABLE tags (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6', -- HEX цвет для UI
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Связь новостей и тэгов
CREATE TABLE news_tags (
    news_id INT NOT NULL REFERENCES news(id) ON DELETE CASCADE,
    tag_id INT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (news_id, tag_id)
);

-- Таблица для хранения статистики
CREATE TABLE news_stats (
    news_id INT NOT NULL REFERENCES news(id) ON DELETE CASCADE,
    views_count INT DEFAULT 0,
    unique_views_count INT DEFAULT 0,
    shares_count INT DEFAULT 0,
    likes_count INT DEFAULT 0,
    -- Среднее время чтения
    avg_read_time_seconds INT, 
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (news_id)
);

-- Таблица для картинок в статьях
CREATE TABLE media (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- Оригинальное имя файла
    original_name TEXT NOT NULL,
    -- Уникальное имя на сервере (например: uuid.jpg)
    storage_name TEXT NOT NULL UNIQUE,
    -- MIME тип (image/jpeg, image/png, image/webp)
    mime_type VARCHAR(100) NOT NULL,
    -- Размер в байтах
    file_size INT NOT NULL,
    -- ID новости, к которой привязана картинка
    news_id INT NOT NULL REFERENCES news(id) ON DELETE CASCADE,
    -- Сортировка картинок в статье (1, 2, 3...)
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
