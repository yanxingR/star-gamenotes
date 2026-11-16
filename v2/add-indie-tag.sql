-- 星GN 严格独立名单：把「独立」追加到 games.genre
-- 在 Supabase Dashboard → SQL Editor 执行一次；可重复执行，不会重复追加。
-- 只改 genre 字段，不改分数、tag（档位）、奖项。

update public.games
set genre = case
  when genre is null or btrim(genre) = '' then '独立'
  when genre ~ '(^|/)独立(/|$)' then genre
  else btrim(genre) || '/独立'
end
where id in (
  392, 416, 391, 367, 418, 368, 379, 372, 373,
  393, 384, 399, 398, 386, 388, 404, 389,
  413, 424, 427, 433, 431, 406, 426, 421
);

-- 执行后核对：应返回 25 行，且每行 genre 含「独立」
select id, name, genre
from public.games
where id in (
  392, 416, 391, 367, 418, 368, 379, 372, 373,
  393, 384, 399, 398, 386, 388, 404, 389,
  413, 424, 427, 433, 431, 406, 426, 421
)
order by id;
