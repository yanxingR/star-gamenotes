-- 星GN：给回合制游戏追加「回合制」类型
-- 在 Supabase SQL Editor 执行；可重复执行，不会重复追加。
-- 已含原有回合制（Persona 5 / 暗喻幻想 / 浪漫沙加2 / 33号 / 空轨1&2 / DQ7 / MH Stories 3 / 数码宝贝）
-- 并补上 Monster Sanctuary / 终天教团 / 喵喵的结合 / 吸血鬼爬行者 / 最终幻想：共鸣。

update public.games
set genre = case
  when genre is null or btrim(genre) = '' then '回合制'
  when genre ~ '(^|/)回合制(/|$)' then genre
  else btrim(genre) || '/回合制'
end
where id in (
  376, 369, 371, 384, 394, 430, 425, 409, 400,
  391, 405, 431, 406, 439
);

-- 核对：这些行 genre 应含「回合制」
select id, name, genre
from public.games
where id in (
  376, 369, 371, 384, 394, 430, 425, 409, 400,
  391, 405, 431, 406, 439
)
order by id;
