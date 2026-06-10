-- Триггер для обновления лайков/дизлайков в news_stat и sources.likes_count/dislikes.count
CREATE OR REPLACE FUNCTION update_reaction_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_source_id INT;
BEGIN

    -- news_stats

    INSERT INTO news_stats(
        news_id,
        likes_count,
        dislikes_count
    )
    VALUES (
        NEW.news_id,
        CASE WHEN NEW.reaction_type='like' THEN 1 ELSE 0 END,
        CASE WHEN NEW.reaction_type='dislike' THEN 1 ELSE 0 END
    )
    ON CONFLICT(news_id)
    DO UPDATE SET
        likes_count =
            news_stats.likes_count +
            CASE WHEN NEW.reaction_type='like' THEN 1 ELSE 0 END,

        dislikes_count =
            news_stats.dislikes_count +
            CASE WHEN NEW.reaction_type='dislike' THEN 1 ELSE 0 END,

        updated_at = NOW();

    -- source

    SELECT source_id
    INTO v_source_id
    FROM news
    WHERE id = NEW.news_id;

    UPDATE sources
    SET
        likes_count =
            likes_count +
            CASE WHEN NEW.reaction_type='like' THEN 1 ELSE 0 END,

        dislikes_count =
            dislikes_count +
            CASE WHEN NEW.reaction_type='dislike' THEN 1 ELSE 0 END
    WHERE id = v_source_id;

    PERFORM recalculate_source_rating(v_source_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- UPDATE
CREATE OR REPLACE FUNCTION update_reaction_update()
RETURNS TRIGGER AS $$
DECLARE
    v_source_id INT;
BEGIN

    IF OLD.reaction_type = NEW.reaction_type THEN
        RETURN NEW;
    END IF;

    -- news_stats

    UPDATE news_stats
    SET
        likes_count =
            likes_count
            - CASE WHEN OLD.reaction_type='like' THEN 1 ELSE 0 END
            + CASE WHEN NEW.reaction_type='like' THEN 1 ELSE 0 END,

        dislikes_count =
            dislikes_count
            - CASE WHEN OLD.reaction_type='dislike' THEN 1 ELSE 0 END
            + CASE WHEN NEW.reaction_type='dislike' THEN 1 ELSE 0 END,

        updated_at = NOW()
    WHERE news_id = NEW.news_id;

    -- source

    SELECT source_id
    INTO v_source_id
    FROM news
    WHERE id = NEW.news_id;

    UPDATE sources
    SET
        likes_count =
            likes_count
            - CASE WHEN OLD.reaction_type='like' THEN 1 ELSE 0 END
            + CASE WHEN NEW.reaction_type='like' THEN 1 ELSE 0 END,

        dislikes_count =
            dislikes_count
            - CASE WHEN OLD.reaction_type='dislike' THEN 1 ELSE 0 END
            + CASE WHEN NEW.reaction_type='dislike' THEN 1 ELSE 0 END
    WHERE id = v_source_id;

    PERFORM recalculate_source_rating(v_source_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- DELETE
CREATE OR REPLACE FUNCTION update_reaction_delete()
RETURNS TRIGGER AS $$
DECLARE
    v_source_id INT;
BEGIN

    -- news_stats

    UPDATE news_stats
    SET
        likes_count =
            likes_count -
            CASE WHEN OLD.reaction_type='like' THEN 1 ELSE 0 END,

        dislikes_count =
            dislikes_count -
            CASE WHEN OLD.reaction_type='dislike' THEN 1 ELSE 0 END,

        updated_at = NOW()
    WHERE news_id = OLD.news_id;

    -- source

    SELECT source_id
    INTO v_source_id
    FROM news
    WHERE id = OLD.news_id;

    UPDATE sources
    SET
        likes_count =
            likes_count -
            CASE WHEN OLD.reaction_type='like' THEN 1 ELSE 0 END,

        dislikes_count =
            dislikes_count -
            CASE WHEN OLD.reaction_type='dislike' THEN 1 ELSE 0 END
    WHERE id = v_source_id;

    PERFORM recalculate_source_rating(v_source_id);

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reaction_insert
AFTER INSERT ON news_reactions
FOR EACH ROW
EXECUTE FUNCTION update_reaction_insert();

CREATE TRIGGER trg_reaction_update
AFTER UPDATE ON news_reactions
FOR EACH ROW
EXECUTE FUNCTION update_reaction_update();

CREATE TRIGGER trg_reaction_delete
AFTER DELETE ON news_reactions
FOR EACH ROW
EXECUTE FUNCTION update_reaction_delete();


-- 2. usage_count для tags

-- INSERT 
CREATE OR REPLACE FUNCTION update_tag_usage_insert()
RETURNS TRIGGER AS $$
BEGIN

    UPDATE tags
    SET
        usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE id = NEW.tag_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- DELETE
CREATE OR REPLACE FUNCTION update_tag_usage_delete()
RETURNS TRIGGER AS $$
BEGIN

    UPDATE tags
    SET
        usage_count = GREATEST(usage_count - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.tag_id;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_news_tags_insert
AFTER INSERT ON news_tags
FOR EACH ROW
EXECUTE FUNCTION update_tag_usage_insert();

CREATE TRIGGER trg_news_tags_delete
AFTER DELETE ON news_tags
FOR EACH ROW
EXECUTE FUNCTION update_tag_usage_delete();


-- 3. daily_tag_stats - выполняется раз в сутки
CREATE OR REPLACE FUNCTION calculate_daily_tag_stats()
RETURNS void AS $$
BEGIN

    INSERT INTO daily_tag_stats (
        stat_date,
        tag_id,
        news_count,
        avg_relevance
    )
    SELECT
        CURRENT_DATE,
        nt.tag_id,
        COUNT(*),
        AVG(n.relevance_score)
    FROM news_tags nt
    JOIN news n ON n.id = nt.news_id
    WHERE DATE(n.publication_date) = CURRENT_DATE
    GROUP BY nt.tag_id

    ON CONFLICT(stat_date, tag_id)
    DO UPDATE SET
        news_count = EXCLUDED.news_count,
        avg_relevance = EXCLUDED.avg_relevance;

END;
$$ LANGUAGE plpgsql;

-- ЗАПУСК: SELECT calculate_daily_tag_stats();

-- 4. sources_daily_stats аналогично
CREATE OR REPLACE FUNCTION calculate_sources_daily_stats()
RETURNS void AS $$
BEGIN

    INSERT INTO sources_daily_stats (
        source_id,
        stat_date,
        news_count,
        avg_relevance_score,
        total_tokens_used,
        avg_processing_time,
        source_rating
    )
    SELECT
        n.source_id,
        CURRENT_DATE,
        COUNT(*),
        ROUND(AVG(n.relevance_score), 2),
        COALESCE(SUM(n.tokens_used), 0),
        ROUND(AVG(n.processing_time), 2),
        MAX(s.rating)
    FROM news n
    JOIN sources s
        ON s.id = n.source_id
    WHERE DATE(n.publication_date) = CURRENT_DATE
    GROUP BY n.source_id

    ON CONFLICT (source_id, stat_date)
    DO UPDATE SET
        news_count = EXCLUDED.news_count,
        avg_relevance_score = EXCLUDED.avg_relevance_score,
        total_tokens_used = EXCLUDED.total_tokens_used,
        avg_processing_time = EXCLUDED.avg_processing_time,
        source_rating = EXCLUDED.source_rating;

END;
$$ LANGUAGE plpgsql;

-- ЗАПУСК: SELECT calculate_sources_daily_stats();

-- 5. daily_system_stats
CREATE OR REPLACE FUNCTION calculate_daily_system_stats()
RETURNS void AS $$
BEGIN

    INSERT INTO daily_system_stats (
        stat_date,
        total_news_published,
        total_unique_tags_used,
        avg_news_relevance,
        avg_source_rating,
        total_reactions,
        like_to_dislike_ratio,
        avg_processing_time,
        updated_at
    )
    SELECT
        CURRENT_DATE,

        COUNT(n.id),

        (
            SELECT COUNT(DISTINCT nt.tag_id)
            FROM news_tags nt
            JOIN news n2 ON n2.id = nt.news_id
            WHERE DATE(n2.publication_date) = CURRENT_DATE
        ),

        ROUND(AVG(n.relevance_score), 2),

        ROUND(AVG(s.rating), 2),

        COALESCE(SUM(ns.total_reactions), 0),

        CASE
            WHEN SUM(ns.dislikes_count) > 0
            THEN ROUND(
                SUM(ns.likes_count)::DECIMAL
                / SUM(ns.dislikes_count),
                2
            )
            ELSE 0
        END,

        ROUND(AVG(n.processing_time), 2),

        NOW()

    FROM news n
    JOIN sources s
        ON s.id = n.source_id
    LEFT JOIN news_stats ns
        ON ns.news_id = n.id

    WHERE DATE(n.publication_date) = CURRENT_DATE

    ON CONFLICT (stat_date)
    DO UPDATE SET
        total_news_published = EXCLUDED.total_news_published,
        total_unique_tags_used = EXCLUDED.total_unique_tags_used,
        avg_news_relevance = EXCLUDED.avg_news_relevance,
        avg_source_rating = EXCLUDED.avg_source_rating,
        total_reactions = EXCLUDED.total_reactions,
        like_to_dislike_ratio = EXCLUDED.like_to_dislike_ratio,
        avg_processing_time = EXCLUDED.avg_processing_time,
        updated_at = NOW();

END;
$$ LANGUAGE plpgsql;

-- 6. Пересчет рейтинга для источника
CREATE OR REPLACE FUNCTION recalculate_source_rating(
    p_source_id INT
)
RETURNS VOID AS $$
DECLARE
    v_likes BIGINT;
    v_dislikes BIGINT;

    v_prior_likes NUMERIC := 7;
    v_prior_votes NUMERIC := 10;

    v_rating NUMERIC;
BEGIN

    SELECT
        likes_count,
        dislikes_count
    INTO
        v_likes,
        v_dislikes
    FROM sources
    WHERE id = p_source_id;

    v_rating :=
        (
            (v_likes + v_prior_likes)
            /
            (v_likes + v_dislikes + v_prior_votes)
        ) * 100;

    UPDATE sources
    SET rating = ROUND(v_rating, 2)
    WHERE id = p_source_id;

END;
$$ LANGUAGE plpgsql;

-- Триггер для высчитывания в source rating при инициализации таблицы по формуле Байесовского рейтинга
CREATE OR REPLACE FUNCTION before_insert_source()
RETURNS TRIGGER AS $$
BEGIN
    -- Если rating не указан при вставке, вычисляем
    IF NEW.rating IS NULL THEN
        NEW.rating := calculate_bayesian_rating(0, 0);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Общая функция для байесовского рейтинга
CREATE OR REPLACE FUNCTION calculate_bayesian_rating(
    p_likes INT,
    p_dislikes INT
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    v_prior_likes NUMERIC;
    v_prior_votes NUMERIC;
BEGIN
    SELECT value::NUMERIC INTO v_prior_likes 
    FROM system_settings WHERE key = 'prior_likes';
    
    SELECT value::NUMERIC INTO v_prior_votes 
    FROM system_settings WHERE key = 'prior_votes';
    
    v_prior_likes := COALESCE(v_prior_likes, 7);
    v_prior_votes := COALESCE(v_prior_votes, 10);
    
    RETURN ROUND(
        ((v_prior_likes + p_likes) / (v_prior_votes + p_likes + p_dislikes)) * 100,
        2
    );
END;
$$ LANGUAGE plpgsql STABLE;