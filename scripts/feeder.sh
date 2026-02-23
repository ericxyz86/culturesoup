#!/bin/bash
# CultureSoup Supplemental Feeder
# Runs on Mac Mini — Bird user-tweets (free) + last30days (Reddit/Web)
# Outputs JSON compatible with CultureSoup's TrendPost format
# Usage: ./feeder.sh [--push]

set -euo pipefail

OUTFILE="/tmp/culturesoup-supplement.json"
BIRD="/opt/homebrew/bin/bird"
SKILL_ROOT="$HOME/.claude/skills/last30days"
BIRD_DIR="/tmp/bird-tweets"

echo "[Feeder] Starting CultureSoup supplement scan at $(date)"

# ── Twitter/X via Bird user-tweets ──────────────────────────────────
echo "[Feeder] Fetching user-tweets via Bird..."

rm -rf "$BIRD_DIR" && mkdir -p "$BIRD_DIR"

ACCOUNTS=(
  "OpenAI" "AnthropicAI" "GoogleDeepMind" "MistralAI" "MetaAI"
  "DeepSeek_AI" "PerplexityAI" "CursorAI" "HuggingFace"
  "sama" "DarioAmodei" "karpathy" "ylecun" "fchollet" "drjimfan"
  "emollick" "GaryMarcus" "jeffdean" "hardmaru" "jackclark"
  "TheAIGRID" "AiBreakfast" "rowancheung" "bindureddy"
  "benedictevans" "kevinroose" "karaswisher" "ID_AA_Carmack"
  "elonmusk" "satyanadella" "Miles_Brundage" "naval"
)

FETCHED=0
for handle in "${ACCOUNTS[@]}"; do
  echo -n "[Feeder]   @$handle..."
  OUTPATH="$BIRD_DIR/$handle.json"
  
  $BIRD user-tweets "$handle" -n 10 --json 2>/dev/null > "$OUTPATH" || echo "[]" > "$OUTPATH"
  
  SIZE=$(python3 -c "import json; print(len(json.load(open('$OUTPATH'))))" 2>/dev/null || echo 0)
  if [ "$SIZE" -gt 0 ]; then
    echo " $SIZE tweets"
    FETCHED=$((FETCHED + 1))
  else
    echo " skip"
    rm -f "$OUTPATH"
  fi
  
  sleep 1
done

echo "[Feeder] Fetched from $FETCHED accounts"

# ── Parse ALL Bird results into TrendPost format ──────────────────
echo "[Feeder] Parsing Bird results..."

python3 << 'PYEOF'
import json, re, os, glob
from datetime import datetime, timezone

MAX_AGE = 48  # hours
now = datetime.now(timezone.utc)
posts = []
seen_ids = set()
total_tweets = 0

AI_KW = re.compile(
    r'\b(AI|artificial.intelligence|machine.learning|deep.learning|LLM|GPT|'
    r'ChatGPT|OpenAI|Claude|Anthropic|Gemini|Mistral|neural|transformer|'
    r'diffusion|deepfake|AGI|model|training|inference|agent|copilot|'
    r'generative|Codex|Sora|DALL.E|Midjourney|Stable.Diffusion|reasoning|'
    r'DeepSeek|Perplexity|GPT.5|GPT.4|o1|o3)\b', re.I)

ALWAYS_AI = {'OpenAI','AnthropicAI','GoogleDeepMind','MistralAI','MetaAI',
             'DeepSeek_AI','PerplexityAI','CursorAI','HuggingFace',
             'karpathy','drjimfan','TheAIGRID','AiBreakfast','rowancheung',
             'emollick','GaryMarcus','hardmaru','jackclark','Miles_Brundage'}

for fpath in glob.glob('/tmp/bird-tweets/*.json'):
    try:
        with open(fpath) as f:
            tweets = json.load(f)
    except:
        continue
    
    for t in tweets:
        total_tweets += 1
        tid = t.get('id', '')
        if tid in seen_ids:
            continue
        seen_ids.add(tid)
        
        text = t.get('text', '')
        if not text:
            continue
        
        created = t.get('createdAt') or ''
        tweet_time = None
        for fmt in ['%a %b %d %H:%M:%S %z %Y', '%Y-%m-%dT%H:%M:%S.%fZ']:
            try:
                tweet_time = datetime.strptime(created, fmt)
                if tweet_time.tzinfo is None:
                    tweet_time = tweet_time.replace(tzinfo=timezone.utc)
                break
            except:
                continue
        
        if not tweet_time:
            continue
        
        hours_old = (now - tweet_time).total_seconds() / 3600
        if hours_old > MAX_AGE or hours_old < 0:
            continue
        
        likes = int(t.get('likeCount', 0) or 0)
        rts = int(t.get('retweetCount', 0) or 0)
        replies = int(t.get('replyCount', 0) or 0)
        
        score = likes + rts * 2 + replies
        if score < 50:
            continue
        
        author = t.get('author', {})
        handle = author.get('username') or 'unknown'
        
        if handle not in ALWAYS_AI and not AI_KW.search(text):
            continue
        
        title = text[:200].replace('\n', ' ').strip()
        url = t.get('url') or f'https://x.com/{handle}/status/{tid}'
        velocity = round(score / max(hours_old, 0.5), 2)
        
        def fmt(n):
            if n >= 1_000_000: return f"{n/1_000_000:.1f}M"
            if n >= 1_000: return f"{n/1_000:.1f}K"
            return str(n)
        
        posts.append({
            'title': title,
            'url': url,
            'platform': 'X/Twitter',
            'platformDetail': f'@{handle} · {fmt(likes)} likes',
            'engagement': score,
            'engagementLabel': f'{fmt(likes)} likes · {fmt(rts)} RTs · {fmt(replies)} replies',
            'hoursOld': round(hours_old, 1),
            'velocity': velocity,
            'discoveredAt': tweet_time.isoformat(),
            'source': 'bird-user-tweets'
        })

posts.sort(key=lambda x: x['velocity'], reverse=True)

with open('/tmp/bird-posts.json', 'w') as f:
    json.dump(posts[:50], f, indent=2)

print(f"[Feeder] Bird: {len(posts)} AI posts (from {total_tweets} total tweets, {len(seen_ids)} unique)")
PYEOF

# ── Reddit + Web via last30days ─────────────────────────────────────
echo "[Feeder] Running last30days for Reddit + Web..."

python3 "$SKILL_ROOT/scripts/last30days.py" \
  "trending AI artificial intelligence ChatGPT Claude GPT Gemini" \
  --quick --emit=compact --store > /tmp/l30-raw.txt 2>&1 || true

python3 << 'PYEOF'
import json, re
from datetime import datetime, timezone

posts = []
now = datetime.now(timezone.utc)

with open('/tmp/l30-raw.txt') as f:
    output = f.read()

# Parse Reddit: **R{n}** (score:{n}) r/{sub} ({date})
reddit_pat = re.compile(
    r'\*\*R\d+\*\*\s+\(score:(\d+)\)\s+r/(\w+)\s+\((\d{4}-\d{2}-\d{2})\)\s*\n\s*(.+?)\n\s*(https?://\S+)', re.M)

for m in reddit_pat.finditer(output):
    score = int(m.group(1))
    sub = m.group(2)
    date_str = m.group(3)
    title = m.group(4).strip()
    url = m.group(5).strip()
    
    try:
        dt = datetime.strptime(date_str, '%Y-%m-%d').replace(tzinfo=timezone.utc)
        hours = (now - dt).total_seconds() / 3600
        if hours > 48: continue
    except:
        hours = 24
        dt = now
    
    velocity = round(score / max(hours, 1), 2)
    posts.append({
        'title': title, 'url': url, 'platform': 'Reddit',
        'platformDetail': f'r/{sub} · {score} pts (via last30days)',
        'engagement': score, 'engagementLabel': f'{score} pts',
        'hoursOld': round(hours, 1), 'velocity': velocity,
        'discoveredAt': dt.isoformat(), 'source': 'last30days'
    })

with open('/tmp/l30-posts.json', 'w') as f:
    json.dump(posts, f, indent=2)

print(f"[Feeder] last30days: {len(posts)} posts")
PYEOF

# ── Merge ────────────────────────────────────────────────────────────
python3 << 'PYEOF'
import json
from datetime import datetime, timezone

bird = json.load(open('/tmp/bird-posts.json'))
l30 = json.load(open('/tmp/l30-posts.json'))
merged = bird + l30

seen = set()
deduped = []
for p in merged:
    u = p['url'].split('?')[0].rstrip('/')
    if u not in seen:
        seen.add(u)
        deduped.append(p)

deduped.sort(key=lambda x: x.get('velocity', 0), reverse=True)

output = {
    'generatedAt': datetime.now(timezone.utc).isoformat(),
    'birdCount': len(bird),
    'last30Count': len(l30),
    'totalCount': len(deduped),
    'posts': deduped[:50]
}

with open('/tmp/culturesoup-supplement.json', 'w') as f:
    json.dump(output, f, indent=2)

print(f"[Feeder] Total: {len(deduped)} posts ({len(bird)} Bird + {len(l30)} last30days)")
PYEOF

echo "[Feeder] Saved to $OUTFILE"

# ── Push ─────────────────────────────────────────────────────────────
if [[ "${1:-}" == "--push" ]]; then
  echo "[Feeder] Pushing to CultureSoup..."
  CONTAINER=$(ssh -i ~/.ssh/hetzner_coolify deploy@37.27.186.15 \
    "sudo docker ps --format '{{.Names}}' | grep qo4gk8cwww80ww4kw4gs444g" 2>/dev/null || true)
  if [ -n "$CONTAINER" ]; then
    scp -i ~/.ssh/hetzner_coolify "$OUTFILE" deploy@37.27.186.15:/tmp/culturesoup-supplement.json
    ssh -i ~/.ssh/hetzner_coolify deploy@37.27.186.15 \
      "sudo docker cp /tmp/culturesoup-supplement.json $CONTAINER:/app/supplement.json"
    echo "[Feeder] Pushed to container $CONTAINER"
  fi
  
  curl -s -X POST "https://culturesoup.aiailabs.net/api/supplement" \
    -H "Content-Type: application/json" \
    -H "X-Feeder-Key: cs-feeder-2026" \
    -d @"$OUTFILE" > /dev/null 2>&1 && echo "[Feeder] POSTed to API" || echo "[Feeder] API POST failed"
fi

echo "[Feeder] Done at $(date)"
