"""Weekly check: top 100 of the official league table vs the Slavic Alliance snapshot.

Read-only, stdlib only, no database: it reads the same public R2 snapshot that
slavicalliance.cz/vysledky renders (data.slavicalliance.cz/league/<id>.json) and
the official page hospodskykviz.cz/vysledky/<hk id>. Teams are matched by the
Hospodsky kviz team key (official /tym/<key> vs identity:["team", <key>]).

Rule (robust to ties): take every team whose official rank <= TOP (the official
table shares ranks on ties, so a whole tie group is in or out). Each must be in
the snapshot with the same points and the same placement as the site computes
it (points desc, best quiz desc, fewer members; equal score -> shared place).
Symmetrically, every snapshot team placed <= TOP must be in the official top.
Also fails when the snapshot's last result is older than --max-age-days.

Exit 0 = ok, 1 = mismatch/stale, 2 = fetch/parse failure.
"""
from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import re
import sys
import time
import urllib.request

SNAPSHOT = "https://data.slavicalliance.cz/league/{}.json"


def fetch(url: str, attempts: int = 5) -> str:
    for attempt in range(attempts):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "slavicalliance-top100-check"})
            with urllib.request.urlopen(req, timeout=60) as resp:
                return resp.read().decode("utf-8")
        except Exception as exc:  # official site answers 504 under load
            print(f"retry {attempt + 1}/{attempts} {url}: {exc}", file=sys.stderr)
            time.sleep(10 * (attempt + 1))
    print(f"could not fetch {url}", file=sys.stderr)
    sys.exit(2)


def clean(text: str) -> str:
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"<!--.*?-->|<[^>]+>", "", text, flags=re.S))).strip()


def official_table(page: str) -> dict[str, tuple[int, str, float]]:
    out: dict[str, tuple[int, str, float]] = {}
    for row in re.findall(r"<tr>(.*?)</tr>", page, re.S):
        cells = re.findall(r"<td[^>]*>(.*?)</td>", row, re.S)
        key = re.search(r"/tym/(\d+)", row)
        if len(cells) < 6 or not key:
            continue
        try:
            out[key.group(1)] = (int(clean(cells[0])), clean(cells[1]), float(clean(cells[4]).replace(",", ".")))
        except ValueError:
            continue
    return out


def our_table(snapshot: dict) -> dict[str, tuple[int, str, float]]:
    rows = []
    for team in snapshot["teams"]:
        found = re.search(r'identity:\["team",\s*(\d+)\]', team["teamKey"])
        res = team["leagueResults"]  # default view: all played rounds, no cut
        points = sum(r["points"] for r in res)
        best = max([0, *(r["points"] for r in res)])
        members = sum(r.get("members") or 0 for r in res)
        rows.append((found.group(1) if found else None, team["teamName"], points, best, members))
    rows.sort(key=lambda r: (-r[2], -r[3], r[4]))
    out: dict[str, tuple[int, str, float]] = {}
    prev, place = None, 0
    for index, (key, name, points, best, members) in enumerate(rows):
        score = (points, members, best)
        place = place if score == prev else index + 1
        prev = score
        if key:
            out[key] = (place, name, points)
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--league-id", type=int, default=178, help="Slavic Alliance league id (178 = HK 499)")
    ap.add_argument("--top", type=int, default=100)
    ap.add_argument("--max-age-days", type=int, default=9)
    args = ap.parse_args()

    snap = json.loads(fetch(SNAPSHOT.format(args.league_id)))
    official = official_table(fetch(snap["leagueUrl"]))
    if len(official) < args.top:
        print(f"official table parsed only {len(official)} teams", file=sys.stderr)
        return 2
    ours = our_table(snap)

    problems: list[str] = []
    last = snap.get("lastResultDate")
    if last:
        age = (dt.datetime.now(dt.timezone.utc) - dt.datetime.fromisoformat(last.replace("Z", "+00:00"))).days
        if age > args.max_age_days:
            problems.append(f"snapshot stale: lastResultDate={last} ({age} days)")

    for key, (rank, name, points) in sorted(official.items(), key=lambda kv: kv[1][0]):
        if rank > args.top:
            continue
        mine = ours.get(key)
        if mine is None:
            problems.append(f"#{rank} {name} ({key}): missing on slavicalliance")
        elif abs(mine[2] - points) > 1e-9 or mine[0] != rank:
            problems.append(f"#{rank} {name} ({key}): official {points} @{rank}, ours {mine[2]} @{mine[0]}")
    for key, (place, name, points) in ours.items():
        if place <= args.top and official.get(key, (10**9,))[0] > args.top:
            problems.append(f"ours @{place} {name} ({key}) {points}: not in official top {args.top}")

    print(f"{snap['leagueName']}: official={len(official)} ours={len(ours)} top={args.top} problems={len(problems)}")
    for line in problems[:60]:
        print("  " + line)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
