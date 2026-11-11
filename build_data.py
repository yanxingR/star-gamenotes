# -*- coding: utf-8 -*-
"""Build site/data.js from the original index page's data.json.

Read-only on data.json. The original site's model is preserved:
weights 15/10/25/18/7/10/10/5 and the story formula 0.4/0.6.
"""
import json
import datetime
import statistics

SRC = "data.json"
OUT = "site/data.js"

DIMS = [
    {"key": "craft", "label": "制作水准", "short": "制作", "weight": 0.15,
     "subs": [["objective", "客观制作水准"], ["design", "设计巧思"]],
     "formula": "客观制作水准 × 0.4 + 设计巧思 × 0.6"},
    {"key": "content", "label": "内容饱满度", "short": "内容", "weight": 0.10,
     "subs": [["volume", "客观体量"], ["quality", "内容质量系数"]],
     "formula": "MIN( MIN(体量, 体量×系数/8.5)×0.4 + (体量×系数/8.5)×0.6, 10 )"},
    {"key": "gameplay", "label": "游戏性", "short": "游戏性", "weight": 0.25,
     "subs": [], "formula": "直接评分"},
    {"key": "story", "label": "故事性", "short": "故事性", "weight": 0.18,
     "subs": [["script", "剧本内容"], ["narrative", "叙事"]],
     "formula": "MIN( 剧本内容×0.4 + (剧本内容×叙事/8.5)×0.6, 10 )"},
    {"key": "immersion", "label": "代入感 / 沉浸感", "short": "代入感", "weight": 0.07,
     "subs": [["empathy", "代入感"], ["flow", "沉浸感"]],
     "formula": "MAX( 代入感, 沉浸感 )"},
    {"key": "art", "label": "美术", "short": "美术", "weight": 0.10,
     "subs": [], "formula": "直接评分"},
    {"key": "audio", "label": "视听", "short": "视听", "weight": 0.10,
     "subs": [["music", "音乐"], ["staging", "演出"]],
     "formula": "音乐 × 0.6 + 演出 × 0.4"},
    {"key": "love", "label": "“爱”之力", "short": "爱之力", "weight": 0.05,
     "subs": [], "formula": "直接评分"},
]

TAG_ORDER = ["夯", "顶级", "人上人", "NPC", "拉", "拉完了"]

src = json.load(open(SRC, encoding="utf-8"))

games = []
warn = 0
for x in src:
    dims = [round(float(v), 4) if v is not None else None for v in x["dims"]]
    subs = [[round(float(v), 4) for v in group] for group in x["sub_dims"]]
    calc = sum((dims[i] or 0) * DIMS[i]["weight"] for i in range(8))
    score = round(float(x["score"]), 2)
    if abs(calc - score) > 0.011:
        warn += 1
        print(f"WARN score drift: {x['name']} stored={score} calc={calc:.3f}")

    games.append({
        "id": int(x["id"]),
        "name": x["name"].strip(),
        "score": score,
        "tag": x.get("tag") or "NPC",
        "dims": dims,
        "subs": subs,
        "cover": x.get("cover") or "",
        "thumb": x.get("cover_thumb") or x.get("cover") or "",
        "desc": (x.get("description") or "").strip(),
        "genre": [t.strip() for t in (x.get("genre") or "").split("/") if t.strip()],
        "playtime": (x.get("playtime") or "").strip(),
        "developer": (x.get("developer") or "").strip(),
        "year": int(x["release_year"]) if x.get("release_year") else None,
        "platform": [t.strip() for t in (x.get("platform") or "").split("/") if t.strip()],
    })

ranked = sorted(games, key=lambda g: (-g["score"], g["id"]))
for i, g in enumerate(ranked):
    g["rank"] = i + 1

scores = [g["score"] for g in games]
tag_counts = {t: sum(1 for g in games if g["tag"] == t) for t in TAG_ORDER}
years = [g["year"] for g in games if g["year"]]

stats = {
    "count": len(games),
    "avg": round(statistics.mean(scores), 4),
    "median": round(statistics.median(scores), 4),
    "max": round(max(scores), 4),
    "min": round(min(scores), 4),
    "top": ranked[0]["name"],
    "top5": [g["name"] for g in ranked[:5]],
    "tagCounts": tag_counts,
    "yearMin": min(years),
    "yearMax": max(years),
    "gamesThisYear": sum(1 for y in years if y == max(years)),
}

dim_avg = {
    d["key"]: round(statistics.mean(g["dims"][i] for g in games if g["dims"][i] is not None), 4)
    for i, d in enumerate(DIMS)
}

payload = {
    "source": "原 index 页 · data.json",
    "generatedAt": datetime.date.today().isoformat(),
    # 只保留前端需要的维度字段；权重与公式不在页面上展示
    "dims": [
        {"key": d["key"], "label": d["label"], "short": d["short"], "subs": d["subs"]}
        for d in DIMS
    ],
    "stats": stats,
    "dimAvg": dim_avg,
    "games": games,
}

with open(OUT, "w", encoding="utf-8") as f:
    f.write("/* Generated from data.json (original index page) — do not edit by hand. */\n")
    f.write("window.GN_DATA = ")
    json.dump(payload, f, ensure_ascii=False, indent=1)
    f.write(";\n")

print("games:", len(games), "score warnings:", warn)
print("stats:", stats)
print("dimAvg:", dim_avg)
for g in ranked[:5]:
    print(f'{g["score"]:.2f}', g["tag"], g["name"])
