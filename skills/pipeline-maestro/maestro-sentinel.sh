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
# Each <request id> names an open capture request: a `CAPTURAS PRONTAS: ` line whose last ` — ` field, trailing spaces
# trimmed, is `pedido <request id>` is reported even when it is already on screen at the first poll (the maestro was busy
# while the executor finished). The id is new for every request, so an older line for the same folder never matches.
# A <request id>=<folder> argument also watches <folder>/medidas.json (the tool writes it last, in one go): once its
# modification time differs from the one seen at the first poll (absent counts as a time), the sentinel prints
# `MEDIDAS PRONTAS: pedido <id> — <folder>/medidas.json`, because the executor does not always print its line. Each
# request id is reported once, by whichever comes first: its `CAPTURAS PRONTAS` line or its new `medidas.json`.
# `<request id>@<epoch>=<folder>` (the time the maestro sent the request) reports a `medidas.json` modified at or after
# <epoch> even at the first poll, so a delivery that landed while no sentinel ran is not taken as the baseline.
# Usage: maestro-sentinel.sh <executor terminal> <note name> [idle-minutes=20] [poll-seconds=60] [<request id>[@<epoch>][=<folder>]...]
terminal=$1; note=$2; idle_min=${3:-20}; poll=${4:-60}
expected=(); folders=(); since=(); baseline=(); reported=" "
for arg in "${@:5}"; do
  folder=""; [[ $arg == *=* ]] && { folder=${arg#*=}; arg=${arg%%=*}; }
  epoch=""; [[ $arg == *@* ]] && { epoch=${arg#*@}; arg=${arg%%@*}; }
  expected+=("$arg"); folders+=("$folder"); since+=("$epoch")
done
limit=$((idle_min * 60)); stalled=0; last_alert=0; first=1; prev=""; changed_at=$(date +%s); prev_keys=""

# Modification time of <folder>/medidas.json in seconds, or "absent". `date -r <file>` works on BSD and GNU date.
stamp_of() {
  local file="${1%/}/medidas.json"
  if [[ -f $file ]]; then date -r "$file" +%s 2>/dev/null || echo absent; else echo absent; fi
}

# The request id of a `CAPTURAS PRONTAS: ` line: its last ` — ` field, trailing spaces trimmed, without `pedido `.
request_of() {
  local last=${1##* — }; last=${last%"${last##*[![:space:]]}"}
  [[ $last == "pedido "* ]] && printf '%s' "${last#pedido }"
}

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
    request=""
    [[ $found == "CAPTURAS PRONTAS: "* ]] && request=$(request_of "$found")
    if (( first )); then
      awaited=0
      if [[ -n $request ]]; then
        for id in "${expected[@]}"; do [[ $request == "$id" ]] && awaited=1; done
      fi
      (( awaited && nth == 0 )) || continue
    elif (( nth + 1 <= before )); then
      continue
    fi
    if [[ -n $request ]]; then
      [[ $reported == *" $request "* ]] && continue
      reported+="$request "
    fi
    case $found in
      "PR #"*)
        if ! maestri note edit "$note" "## Em execução" "## Em execução\\n$found — $(date +%F)" >/dev/null 2>&1; then
          echo "SENTINEL $terminal: note edit failed: $found"
        fi ;;
      *) echo "SENTINEL $terminal: $found" ;;
    esac
  done <<< "$screen"
  prev_keys=$cur_keys
  for i in "${!expected[@]}"; do
    [[ -z ${folders[i]} ]] && continue
    current=$(stamp_of "${folders[i]}")
    if [[ -n ${since[i]} ]]; then
      [[ $current == absent ]] || (( current < since[i] )) && continue
    else
      if (( first )); then baseline[i]=$current; continue; fi
      [[ $current == absent || $current == "${baseline[i]}" ]] && continue
    fi
    [[ $reported == *" ${expected[i]} "* ]] && continue
    reported+="${expected[i]} "
    echo "SENTINEL $terminal: MEDIDAS PRONTAS: pedido ${expected[i]} — ${folders[i]%/}/medidas.json"
  done
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
