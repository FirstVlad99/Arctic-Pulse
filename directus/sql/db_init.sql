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

-- Таблица с новостями
CREATE TABLE news (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title TEXT NOT NULL,
    -- Уникальный идентификатор для URL
    slug TEXT NOT NULL,
    -- Полный текст новости в HTML
    content TEXT NOT NULL,
    -- Без HTML
    content_clean TEXT NOT NULL,
    source_url TEXT NOT NULL,
    publication_date TIMESTAMPTZ NOT NULL,
    material_author TEXT NOT NULL,
    source_id INT NOT NULL REFERENCES sources(id),
    is_arctic BOOLEAN NOT NULL,
    summary_ai TEXT,
    -- Исходная метка классификации из предыдущей системы
    classification_original TEXT,
    tokens_used INT,
    -- Время обработки в секундах
    processing_time  DECIMAL(10, 2),
    -- Дата и время обработки нейросетью
    processed_at TIMESTAMPTZ  NOT NULL,
    created_at TIMESTAMPTZ NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица тэгов
CREATE TABLE tags (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(120) GENERATED ALWAYS AS (LOWER(REPLACE(name, ' ', '-'))) STORED,
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
