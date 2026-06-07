-- Таблица с источниками новостей
CREATE TABLE sources(
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    rss_url TEXT NOT NULL,
    -- Рейтинг новостного источника (основан на лайках/дизлайках соотв. новостей)
    -- от нуля до 100
    rating DECIMAL(5, 2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 100),
    website_url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_fetched TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alaska Beacon
INSERT INTO sources (name, rss_url, website_url, is_active) 
VALUES ('Alaska Beacon', 'https://alaskabeacon.com/feed/', 'https://alaskabeacon.com/', true);
-- gCaptain
INSERT INTO sources (name, rss_url, website_url, is_active) 
VALUES ('gCaptain', 'https://gcaptain.com/feed/', 'https://gcaptain.com/feed/', true);
-- Science Business Publishing
INSERT INTO sources (name, rss_url, website_url, is_active) 
VALUES ('Science Business Publishing', 'https://sciencebusiness.net/sciencebusiness.rss', 'https://sciencebusiness.net/', true);
-- Construction Physics
INSERT INTO sources (name, rss_url, website_url, is_active) 
VALUES ('Construction Physics', 'https://www.construction-physics.com/feed', 'https://www.construction-physics.com/', true);
-- Sixty Degrees North
INSERT INTO sources (name, rss_url, website_url, is_active) 
VALUES ('Sixty Degrees North', 'https://sixtydegreesnorth.substack.com/feed', 'https://sixtydegreesnorth.substack.com/', true);
-- Marinelog
INSERT INTO sources (name, rss_url, website_url, is_active) 
VALUES ('Marinelog', 'https://www.marinelog.com/feed/', 'https://www.marinelog.com/', true);
-- Navy Times
INSERT INTO sources (name, rss_url, website_url, is_active) 
VALUES ('Navy Times', 'https://www.navytimes.com/arc/outboundfeeds/rss/category/news/?outputType=xml', 'https://www.navytimes.com/', true);
-- Dialogue Earth
INSERT INTO sources (name, rss_url, website_url, is_active) 
VALUES ('Dialogue Earth', 'https://dialogue.earth/en/feed/', 'https://dialogue.earth/', true);
-- Alaska Native News
INSERT INTO sources (name, rss_url, website_url, is_active) 
VALUES ('Alaska Native News', 'https://alaska-native-news.com/feed/', 'https://alaska-native-news.com/', true);
-- Swedish Defence Research Agency
INSERT INTO sources (name, rss_url, website_url, is_active) 
VALUES ('Swedish Defence Research Agency', 'https://www.foi.se/4.1b7eb62116732ed52bf491/12.1b7eb62116732ed52bf497.portlet?state=rss&sv.contenttype=text/xml', 'https://www.foi.se/', true);
-- National Snow and Ice Data Center
INSERT INTO sources (name, rss_url, website_url, is_active) 
VALUES ('National Snow and Ice Data Center', 'https://nsidc.org/news/feed', 'https://nsidc.org/', true);
-- Arctic Research Blogs
INSERT INTO sources (name, rss_url, website_url, is_active) 
VALUES ('Arctic Research Blogs', 'https://arcticresearch.wordpress.com/feed/', 'https://arcticresearch.wordpress.com/', true);
-- The Great White Con
INSERT INTO sources (name, rss_url, website_url, is_active) 
VALUES ('The Great White Con', 'https://greatwhitecon.info/blog/feed/', 'https://greatwhitecon.info/', true);
-- The Arctic Economic Council
INSERT INTO sources (name, rss_url, website_url, is_active) 
VALUES ('Alaska Native News', 'https://arcticeconomiccouncil.com/feed/', 'https://arcticeconomiccouncil.com/', true);
-- The Arctic Institute
INSERT INTO sources (name, rss_url, website_url, is_active) 
VALUES ('The Arctic Institute', 'https://www.thearcticinstitute.org/feed/', 'https://www.thearcticinstitute.org/', true);


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
    -- Актуальность новости, может принимать значения от 0 до 100
    relevance_score DECIMAL(5, 2) DEFAULT 0 CHECK (relevance_score >= 0 AND relevance_score <= 100),
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
    -- HEX цвет для UI
    color VARCHAR(7) DEFAULT '#3B82F6', 
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
    news_id INT NOT NULL REFERENCES news(id) ON DELETE CASCADE PRIMARY KEY,
    likes_count INT DEFAULT 0,
    dislikes_count INT DEFAULT 0,
    -- Вычисляю итоговое кол-во реакций и % лайков от всех реакций
    total_reactions INT GENERATED ALWAYS AS (likes_count + dislikes_count) STORED,
    like_ratio DECIMAL(5, 2) GENERATED ALWAYS AS (
        CASE 
            WHEN (likes_count + dislikes_count) > 0 
            THEN (likes_count::DECIMAL / (likes_count + dislikes_count)) * 100 
            ELSE 0 
        END
    ) STORED,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
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
    -- Сортировка картинок в статье
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица лайков/дизлайков для новостей
CREATE TABLE news_reactions (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    news_id INT NOT NULL REFERENCES news(id) ON DELETE CASCADE,
    -- Временный токен из Redis
    session_token VARCHAR(255) NOT NULL, 
    reaction_type VARCHAR(10) NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Один токен может иметь только одну реакцию на новость
    UNIQUE(news_id, session_token)
);
