-- Регистрация коллекций в Directus
INSERT INTO directus_collections (collection, icon, note, display_template, hidden, singleton, accountability, color, "group", sort)
VALUES 
('sources', 'cloud', NULL, NULL, false, false, 'all', NULL, NULL, NULL),
('news', 'article', NULL, NULL, false, false, 'all', NULL, NULL, NULL),
('tags', 'local_offer', NULL, NULL, false, false, 'all', NULL, NULL, NULL),
('news_tags', 'link', NULL, NULL, false, false, 'all', NULL, NULL, NULL),
('news_stats', 'bar_chart', NULL, NULL, false, false, 'all', NULL, NULL, NULL),
('media', 'image', NULL, NULL, false, false, 'all', NULL, NULL, NULL),
('news_reactions', 'thumb_up', NULL, NULL, false, false, 'all', NULL, NULL, NULL),
('daily_tag_stats', 'query_stats', NULL, NULL, false, false, 'all', NULL, NULL, NULL),
('sources_daily_stats', 'analytics', NULL, NULL, false, false, 'all', NULL, NULL, NULL),
('daily_system_stats', 'insights', NULL, NULL, false, false, 'all', NULL, NULL, NULL),
('system_settings', 'settings', NULL, NULL, false, false, 'all', NULL, NULL, NULL),
('digests', 'newspaper', NULL, NULL, false, false, 'all', NULL, NULL, NULL),
('digest_news', 'link', NULL, NULL, false, false, 'all', NULL, NULL, NULL)
ON CONFLICT (collection) DO NOTHING;
