#!/usr/bin/env bash
# Watches a subagent's transcript without reading it: one line when the file stops growing for
# <idle-minutes>, repeated every <idle-minutes> while it stays idle, and one line when it resumes.
# The path may be a symlink (the Agent tool's output_file is): the target's mtime is what counts.
# Usage: agent-sentinel.sh <label> <transcript-file> [idle-minutes=15] [poll-seconds=60]
label=$1; file=$2; idle_min=${3:-15}; poll=${4:-60}
limit=$((idle_min * 60)); stalled=0; last_alert=0

# GNU stat first: BSD stat rejects -c without printing; GNU would treat BSD's -f as --file-system
# and print to stdout, so a failed attempt's output is always discarded.
mtime_of() {
  local out
  if out=$(stat -L -c %Y "$1" 2>/dev/null); then echo "$out"
  elif out=$(stat -L -f %m "$1" 2>/dev/null); then echo "$out"
  else return 1
  fi
}

while true; do
  if [[ ! -f $file ]]; then echo "SENTINEL $label: transcript missing"; exit 1; fi
  now=$(date +%s)
  if ! mtime=$(mtime_of "$file"); then echo "SENTINEL $label: transcript missing"; exit 1; fi
  idle=$((now - mtime))
  if (( idle >= limit )); then
    if (( now - last_alert >= limit )); then
      echo "SENTINEL $label: STALLED — no activity for $((idle / 60)) min"
      last_alert=$now; stalled=1
    fi
  elif (( stalled )); then
    echo "SENTINEL $label: resumed after stall"; stalled=0; last_alert=0
  fi
  sleep "$poll"
done
