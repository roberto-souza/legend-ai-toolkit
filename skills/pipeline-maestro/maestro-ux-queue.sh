#!/usr/bin/env bash
# Queue of single readings for the UX reader: one reading at a time, in the same terminal, each in a clean session.
# For every <pr>:<round>, in order, and every part of its message (`leitura-parte-<i>.md`, written by
# maestro-ux-message.mjs in the round folder): sends the clear command, the resolved role and the part, each by
# `maestri ask`, which returns when the reader ends its turn. The reader output of each part goes to
# `leitura-parte-<i>.log` next to it.
# Prints, for the Monitor, one `UX-QUEUE: PR #<pr> rodada <k> enviado — <n> parte(s)` line before the first part and one
# `UX-QUEUE: PR #<pr> rodada <k> fim — laudo <file>` after the last one. Each part must leave its report: `laudo.md`
# for a single part, `laudo-parte-<i>.md` for part i of n (i < n), and `laudo.md` for the last. A part that ends without
# it prints `fim — laudo ausente <file>` and exits 3 without sending anything else: the reader may have asked something,
# and the maestro answers in that same session before the queue runs again. The message script removes old reports, so
# a report already in the folder answers the current message: a part with its report is skipped, which makes running
# the queue again (after an answer, or after its Monitor expired) resume where it stopped. A missing message prints `sem mensagem` and moves
# on; a failed `maestri ask` prints `falha` and exits 1.
# One queue per UX folder: a lock directory holds the pid of the queue that owns it. Another queue waits while that pid
# is alive (`kill -0`) and takes a stale lock over. Every wait is on a pid, never on `pgrep -f`, whose pattern also
# matches the command line of whoever runs it.
# Round folder: <ux dir>/pr-<pr>/ for round 1, <ux dir>/pr-<pr>/rodada-<k>/ from round 2 on.
# Usage: maestro-ux-queue.sh [--clear <command>] [--poll <seconds>] <ux terminal> <resolved role file> <ux dir> <pr>:<round>...
clear_command=/clear; poll=10
while [[ $1 == --* ]]; do
  case $1 in
    --clear) clear_command=$2; shift 2 ;;
    --poll) poll=$2; shift 2 ;;
    *) echo "UX-QUEUE: unknown flag $1" >&2; exit 2 ;;
  esac
done
terminal=$1; role=$2; ux_dir=${3%/}; shift 3 || { echo "UX-QUEUE: usage: maestro-ux-queue.sh <terminal> <role> <ux dir> <pr>:<round>..." >&2; exit 2; }
(( $# )) || { echo "UX-QUEUE: no <pr>:<round>" >&2; exit 2; }
[[ -f $role ]] || { echo "UX-QUEUE: role file not found: $role" >&2; exit 2; }
for item in "$@"; do
  [[ $item =~ ^[0-9]+:[0-9]+$ ]] || { echo "UX-QUEUE: expected <pr>:<round>, got $item" >&2; exit 2; }
done

lock="$ux_dir/.fila-ux.lock"; child=""
release() { [[ $(cat "$lock/pid" 2>/dev/null) == "$$" ]] && rm -rf "$lock"; }
trap 'release' EXIT
trap '[[ -n $child ]] && kill "$child" 2>/dev/null; exit 143' TERM INT

waiting=0
while ! mkdir "$lock" 2>/dev/null; do
  holder=$(cat "$lock/pid" 2>/dev/null)
  if [[ -n $holder ]] && kill -0 "$holder" 2>/dev/null; then
    (( waiting )) || echo "UX-QUEUE: aguardando a fila do pid $holder"
    waiting=1; sleep "$poll"
  elif [[ -z $holder ]] && [[ -d $lock ]] && (( waiting < 2 )); then
    waiting=2; sleep 1  # the owner may be between mkdir and writing its pid
  else
    # Stale: only the queue whose rename succeeds removes it, so two queues never both take over.
    mv "$lock" "$lock.stale.$$" 2>/dev/null && rm -rf "$lock.stale.$$"
    waiting=0
  fi
done
echo "$$" > "$lock/pid"

# Runs one `maestri ask` in the background, appends its output to the log and waits on its pid.
ask() {
  local text=$1 log=$2
  maestri ask "$terminal" "$text" >> "$log" 2>&1 &
  child=$!
  wait "$child"; local status=$?
  child=""
  return "$status"
}

for item in "$@"; do
  pr=${item%%:*}; round=${item#*:}
  folder="$ux_dir/pr-$pr"; (( round >= 2 )) && folder="$folder/rodada-$round"
  parts=()
  for file in "$folder"/leitura-parte-*.md; do [[ -f $file ]] && parts+=("$file"); done
  if (( ${#parts[@]} == 0 )); then echo "UX-QUEUE: PR #$pr rodada $round sem mensagem — $folder"; continue; fi
  # Numeric order: parte-10 after parte-9.
  sorted=(); for (( i = 1; i <= ${#parts[@]}; i++ )); do sorted+=("$folder/leitura-parte-$i.md"); done
  echo "UX-QUEUE: PR #$pr rodada $round enviado — ${#sorted[@]} parte(s)"
  count=${#sorted[@]}
  for (( i = 1; i <= count; i++ )); do
    message="$folder/leitura-parte-$i.md"
    [[ -f $message ]] || { echo "UX-QUEUE: PR #$pr rodada $round falha — parte ausente $message"; exit 1; }
    report="$folder/laudo.md"; (( i < count )) && report="$folder/laudo-parte-$i.md"
    [[ -s $report ]] && continue
    log="${message%.md}.log"; : > "$log"
    for text in "$clear_command" "$(cat "$role")" "$(cat "$message")"; do
      if ! ask "$text" "$log"; then echo "UX-QUEUE: PR #$pr rodada $round falha — maestri ask, log $log"; exit 1; fi
    done
    [[ -s $report ]] || { echo "UX-QUEUE: PR #$pr rodada $round fim — laudo ausente $report"; exit 3; }
  done
  echo "UX-QUEUE: PR #$pr rodada $round fim — laudo $folder/laudo.md"
done
