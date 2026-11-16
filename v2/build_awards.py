# -*- coding: utf-8 -*-
"""Generate v2/awards.js.

- 2025：站主已确定的获奖名单（固定）
- 2026：投票进行中，不预设获奖者；首页显示各奖项当前票数领先者
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "data.json")
OUT = os.path.join(HERE, "awards.js")

# key 保持不变以兼容已提交的投票；jrpg 的展示名改为“角色扮演游戏”
CATEGORIES = [
    {"key": "goty", "name": "年度星光之冠",
     "desc": "星GN 年度最佳游戏"},
    {"key": "story", "name": "年度动人星语",
     "desc": "星GN 年度最佳故事游戏"},
    {"key": "indie", "name": "年度星尘奇迹",
     "desc": "星GN 年度最佳独立游戏"},
    {"key": "jrpg", "name": "年度星界旅人",
     "desc": "星GN 年度最佳角色扮演游戏"},
    {"key": "action", "name": "年度极速流星",
     "desc": "星GN 年度最佳动作游戏"},
    {"key": "art", "name": "年度绮丽星云",
     "desc": "星GN 年度最佳美术游戏"},
    {"key": "av", "name": "年度声光星海",
     "desc": "星GN 年度最佳视听体验游戏"},
]

# 严格独立：独立团队，自发行/独立厂牌，非大厂主导，规模非 3A
INDIE_STRICT = [
    392, 416, 391, 367, 418, 368, 379, 372, 373,
    393, 384, 399, 398, 386, 388, 404, 389,
    413, 424, 427, 433, 431, 406, 426, 421,
]

# 广义独立：独立工作室，但由中型/大厂发行或 AA 规模；是否计入由站主决定
INDIE_BROAD_EXTRA = [
    429, 382, 405, 383, 390,
    411, 432, 422, 438, 423,
]

# 2025 届获奖名单（站主确定）
WINNERS_2025 = {
    "goty": 378,    # 天国：拯救2
    "story": 384,   # 光与影：33号远征队
    "indie": 393,   # 空洞骑士：丝之歌
    "jrpg": 394,    # 空之轨迹 the 1st
    "action": 393,  # 空洞骑士：丝之歌
    "art": 397,     # ARC Raiders（美术 9.5）
    "av": 382,      # 双影奇境（视听 10；与 DISPATCH 并列，总分 8.67 优先）
}

# 新增后续年份时，在这里加一届固定名单；投票届留空 winners
EDITIONS = [
    {"year": 2026, "winners": {}},
    {"year": 2025, "winners": WINNERS_2025},
]

games = json.load(open(SRC, encoding="utf-8")) if os.path.exists(SRC) else []
by_id = {int(g["id"]): g for g in games}

for ed in EDITIONS:
    for key, wid in ed["winners"].items():
        if games and wid not in by_id:
            print(f"WARN: winner id {wid} ({key}, {ed['year']}) not found")

payload = {
    "currentVoteYear": 2026,
    "categories": CATEGORIES,
    "editions": EDITIONS,
    "indieIds": INDIE_STRICT,
    "indieBroadIds": INDIE_STRICT + INDIE_BROAD_EXTRA,
}

with open(OUT, "w", encoding="utf-8") as f:
    f.write("/* 2025 获奖名单由站主指定；2026 为投票届，首页显示实时票数领先者。 */\n")
    f.write("window.GN_AWARDS = ")
    json.dump(payload, f, ensure_ascii=False, indent=1)
    f.write(";\n")

print("currentVoteYear:", payload["currentVoteYear"])
print("editions:", [e["year"] for e in EDITIONS])
for key, wid in WINNERS_2025.items():
    print("2025", key, "->", by_id.get(wid, {}).get("name", wid))
