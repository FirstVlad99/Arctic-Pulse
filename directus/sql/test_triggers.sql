-- Проверка работы триггеров реакций
SELECT 
    '=== ПРОВЕРКА РЕАКЦИЙ ===' as section,
    n.id,
    n.title,
    ns.likes_count,
    ns.dislikes_count,
    ns.total_reactions,
    ns.like_ratio
FROM news n
LEFT JOIN news_stats ns ON n.id = ns.news_id
WHERE n.title LIKE 'Тестовая новость%'
LIMIT 5;

-- Проверка usage_count тегов
SELECT 
    '=== ПРОВЕРКА USAGE_COUNT ===' as section,
    t.name,
    t.usage_count,
    COUNT(nt.news_id) as actual_usage
FROM tags t
LEFT JOIN news_tags nt ON t.id = nt.tag_id
WHERE t.name LIKE 'Тестовый тег%'
GROUP BY t.id, t.name, t.usage_count;

-- Проверка дневной статистики
SELECT 
    '=== ДНЕВНАЯ СТАТИСТИКА ТЕГОВ ===' as section,
    stat_date,
    t.name,
    news_count,
    avg_relevance
FROM daily_tag_stats dts
JOIN tags t ON t.id = dts.tag_id
WHERE t.name LIKE 'Тестовый тег%'
ORDER BY stat_date DESC
LIMIT 10;

-- Проверка последних 7 дней для отчета
SELECT 
    '=== ОТЧЕТ ЗА ПОСЛЕДНИЕ 7 ДНЕЙ ===' as section,
    DATE_TRUNC('day', n.publication_date) as day,
    COUNT(DISTINCT n.id) as total_news,
    COUNT(DISTINCT t.id) as unique_tags,
    AVG(n.relevance_score) as avg_relevance
FROM news n
LEFT JOIN news_tags nt ON n.id = nt.news_id
LEFT JOIN tags t ON nt.tag_id = t.id
WHERE n.publication_date >= CURRENT_DATE - 7
GROUP BY DATE_TRUNC('day', n.publication_date)
ORDER BY day DESC;