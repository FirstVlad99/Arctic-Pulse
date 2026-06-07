1. Статистика по тегам за последние 7 дней
```sql
SELECT
    t.id,
    t.name,
    SUM(dts.news_count) AS total_news,
    ROUND(
        SUM(dts.avg_relevance * dts.news_count)
        / NULLIF(SUM(dts.news_count), 0),
        2
    ) AS avg_relevance
FROM daily_tag_stats dts
JOIN tags t ON t.id = dts.tag_id
WHERE dts.stat_date BETWEEN CURRENT_DATE - 6 AND CURRENT_DATE
GROUP BY t.id, t.name
ORDER BY total_news DESC;
```

2. Сколько новостей у каждого источника за неделю
```sql
SELECT
    s.id,
    s.name,
    SUM(sds.news_count) AS total_news
FROM sources_daily_stats sds
JOIN sources s ON s.id = sds.source_id
WHERE sds.stat_date >= CURRENT_DATE - INTERVAL '6 days'
GROUP BY s.id, s.name
ORDER BY total_news DESC;
```

3. Средняя релевантность по каждому источнику за неделю
```sql
SELECT
    s.id,
    s.name,
    ROUND(
        SUM(sds.avg_relevance_score * sds.news_count)
        / NULLIF(SUM(sds.news_count), 0),
        2
    ) AS avg_relevance
FROM sources_daily_stats sds
JOIN sources s ON s.id = sds.source_id
WHERE sds.stat_date BETWEEN CURRENT_DATE - 6 AND CURRENT_DATE
GROUP BY s.id, s.name
ORDER BY avg_relevance DESC;
```
4. Средняя надежность источников за неделю
```sql
SELECT
    s.id,
    s.name,
    ROUND(AVG(sds.source_rating), 2) AS avg_rating
FROM sources_daily_stats sds
JOIN sources s ON s.id = sds.source_id
WHERE sds.stat_date >= CURRENT_DATE - INTERVAL '6 days'
GROUP BY s.id, s.name
ORDER BY avg_rating DESC;
```

5. Общая статистика системы за неделю
```sql
SELECT
    SUM(total_news_published) AS total_news,
    ROUND(AVG(avg_news_relevance), 2) AS avg_relevance,
    ROUND(AVG(avg_source_rating), 2) AS avg_source_rating,
    SUM(total_reactions) AS total_reactions,
    ROUND(AVG(like_to_dislike_ratio), 2) AS avg_like_ratio,
    ROUND(AVG(avg_processing_time), 2) AS avg_processing_time
FROM daily_system_stats
WHERE stat_date >= CURRENT_DATE - INTERVAL '6 days';
```

6. Дашбордная сводка
```sql
SELECT
    total_news_published,
    total_unique_tags_used,
    avg_news_relevance,
    avg_source_rating,
    total_reactions,
    like_to_dislike_ratio
FROM daily_system_stats
WHERE stat_date = CURRENT_DATE;
```

