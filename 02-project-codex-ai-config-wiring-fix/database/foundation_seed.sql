-- 初始化脚本（示例）
INSERT INTO route_stress_config (route_id, route_name, base_stress_increase_per_month, relief_threshold)
VALUES
('lanyinxuguo','兰因絮果',4,18),
('fushengrumeng','浮生如梦',3,15),
('yingluoyeting','影落掖庭',6,22),
('chenyuansucuo','尘缘夙错',5,20)
ON CONFLICT (route_id) DO UPDATE SET
route_name = EXCLUDED.route_name,
base_stress_increase_per_month = EXCLUDED.base_stress_increase_per_month,
relief_threshold = EXCLUDED.relief_threshold,
updated_at = NOW();
