"""Weekly check: top 100 of the official league table vs the Slavic Alliance snapshot.

Read-only, stdlib only, no database: it reads the same public R2 snapshot that
slavicalliance.cz/vysledky renders (data.slavicalliance.cz/league/<id>.json) and
the official page hospodskykviz.cz/vysledky/<hk id>. Teams are matched by the
Hospodsky kviz team key (official /tym/<key> vs identity:["team", <key>]).

Rule: take the official top TOP (the official table shares ranks on ties, so a whole
tie group at the boundary is in or out). The same teams must be in the same order in
our snapshot ranking (points desc, best quiz desc, fewer members). Points and exact
placements are NOT compared: our league counts fewer quizzes than the official table
(excluded venues), so absolute scores always differ. Teams of one official tie group
may appear in any order. Also fails when the snapshot's last result is older than
--max-age-days.

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

    # official groups of equal rank, top part only
    groups: list[list[str]] = []
    last_rank = None
    for key, (rank, _name, _pts) in sorted(official.items(), key=lambda kv: kv[1][0]):
        if rank > args.top:
            break
        if rank != last_rank:
            groups.append([])
            last_rank = rank
        groups[-1].append(key)
    total = sum(len(g) for g in groups)
    our_order = list(ours)  # insertion order = our ranking
    our_pos = {k: i + 1 for i, k in enumerate(our_order)}
    our_top = set(our_order[:total])
    start = 1
    misplaced: list[tuple[int, str]] = []
    for group in groups:
        end = start + len(group) - 1
        for key in group:
            name, rank = official[key][1], official[key][0]
            pos = our_pos.get(key)
            if pos is None:
                problems.append(f"#{rank} {name} ({key}): missing on slavicalliance")
            elif pos < start or pos > end:
                misplaced.append((abs(pos - (start + end) // 2), f"#{rank} {name} ({key}): ours is at position {pos}"))
        start = end + 1
    missing_set = [k for g in groups for k in g if k in our_pos and k not in our_top]
    extra = [k for k in our_order[:total] if k not in official or official[k][0] > args.top]
    for key in extra:
        problems.append(f"ours @{our_pos[key]} {ours[key][1]} ({key}): not in official top {args.top}")
    misplaced.sort(reverse=True)
    problems.extend(line for _, line in misplaced[:15])
    summary = (f"top {total} teams: {len(misplaced)} in a different position, "
               f"{len(missing_set)} official top teams outside our top, {len(extra)} of our top not in official top")
    if len(misplaced) > 15:
        problems.append(f"... and {len(misplaced) - 15} more teams in a different position")
    if misplaced or extra or missing_set:
        problems.insert(0, summary)

    print(f"{snap['leagueName']}: official={len(official)} ours={len(ours)} top={args.top} problems={len(problems)}")
    for line in problems[:60]:
        print("  " + line)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
