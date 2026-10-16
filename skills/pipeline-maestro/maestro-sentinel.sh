#!/usr/bin/env bash
# Watches the executor terminal without waking the maestro on every PR. Each poll runs `maestri check`.
# Lines already on screen at the first poll are the baseline and are never reported. The screen keeps old
# lines, so each poll counts the occurrences of every extracted text and reports only the extra ones against
# the previous poll: an identical line printed again is reported, one that merely stays on screen is not.
# Only a line that carries the token at its start counts, after terminal decoration (no alphanumeric or backtick
# before it): docs shown on screen quote the same tokens. `PILHA PRONTA: ` and `CAPTURAS PRONTAS: ` must be followed by `PR #<digit>`.
# A line carrying `PR #<n> aberto para #<n>: ` is written to "## Em execução" of the state note and prints nothing.
# A line carrying `PILHA PRONTA: `, `CAPTURAS PRONTAS: ` or `TRAVADO: ` prints one SENTINEL line. A screen unchanged for <idle-minutes>
# prints STALLED (repeated every <idle-minutes>) and, once it changes again, "resumed after stall".
# Failures print one line: `check failed` (exits 1) or `note edit failed: <line>` (keeps polling).
# Usage: maestro-sentinel.sh <executor terminal> <note name> [idle-minutes=20] [poll-seconds=60]
terminal=$1; note=$2; idle_min=${3:-20}; poll=${4:-60}
limit=$((idle_min * 60)); stalled=0; last_alert=0; first=1; prev=""; changed_at=$(date +%s); prev_keys=""

extract() {
  printf '%s\n' "$1" | sed -nE \
    -e 's/^[^[:alnum:]`]*(PR #[0-9]+ aberto para #[0-9]+: .*)$/\1/p' \
    -e 's/^[^[:alnum:]`]*(PILHA PRONTA: PR #[0-9].*)$/\1/p' \
    -e 's/^[^[:alnum:]`]*(CAPTURAS PRONTAS: PR #[0-9].*)$/\1/p' \
    -e 's/^[^[:alnum:]`]*(TRAVADO: .*)$/\1/p'
}

while true; do
  if ! screen=$(maestri check "$terminal" 2>/dev/null); then echo "SENTINEL $terminal: check failed"; exit 1; fi
  now=$(date +%s)
  cur_keys=""
  while IFS= read -r line; do
    found=$(extract "$line")
    [[ -z $found ]] && continue
    nth=$(printf '%s' "$cur_keys" | grep -cxF -- "$found")
    cur_keys+="$found"$'\n'
    before=$(printf '%s' "$prev_keys" | grep -cxF -- "$found")
    (( first || nth + 1 <= before )) && continue
    case $found in
      "PR #"*)
        if ! maestri note edit "$note" "## Em execução" "## Em execução\\n$found — $(date +%F)" >/dev/null 2>&1; then
          echo "SENTINEL $terminal: note edit failed: $found"
        fi ;;
      *) echo "SENTINEL $terminal: $found" ;;
    esac
  done <<< "$screen"
  prev_keys=$cur_keys
  first=0
  if [[ $screen != "$prev" ]]; then
    prev=$screen; changed_at=$now
    if (( stalled )); then echo "SENTINEL $terminal: resumed after stall"; stalled=0; last_alert=0; fi
  else
    idle=$((now - changed_at))
    if (( idle >= limit && now - last_alert >= limit )); then
      echo "SENTINEL $terminal: STALLED — no change for $((idle / 60)) min"
      last_alert=$now; stalled=1
    fi
  fi
  sleep "$poll"
done
