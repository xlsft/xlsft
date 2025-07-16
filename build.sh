#!/bin/bash

env_file="$(dirname "$0")/.env"
if [[ -f "$env_file" ]]; then
    export $(grep -v '^#' "$env_file" | xargs)
else
    echo "[ERROR] .env file not found at $env_file"
    exit 1
fi

TOKEN="$TG_TOKEN"
CHAT_ID="$TG_USER"

log_file="build.log"
build_meta_file="build.json"
project_dir="/home/server/xlsft.ru"
log_limit=10485760  # 10 MB
status_text="📄 Сборка..."
message_id=""

send_msg() {
    local text="$1"
    curl -s -X POST "https://api.telegram.org/bot$TOKEN/sendMessage" \
        -d chat_id="$CHAT_ID" \
        -d parse_mode=Markdown \
        -d "text=$text"
}

edit_msg() {
    local text="$1"
    curl -s -X POST "https://api.telegram.org/bot$TOKEN/editMessageText" \
        -d chat_id="$CHAT_ID" \
        -d message_id="$message_id" \
        -d parse_mode=Markdown \
        -d "text=$text"
}

send_log_file() {
    local file="$1"
    if [[ ! -f "$file" ]]; then
        send_msg "_Log file not found._"
        return
    fi

    curl -s -X POST "https://api.telegram.org/bot$TOKEN/sendDocument" \
        -F chat_id="$CHAT_ID" \
        -F document=@"$file" \
        -F caption="📄 Full build log file"
}

read_package_version() {
    local package_json="$project_dir/package.json"
    if [[ ! -f "$package_json" ]]; then
        echo "[ERROR] package.json not found!"
        echo "0.0.0"
        return
    fi
    grep '"version"' "$package_json" | head -1 | sed -E 's/.*"version": *"([^"]+)".*/\1/'
}

read_build_info() {
    if [[ ! -f "$build_meta_file" ]]; then
        echo "[ERROR] build.json not found!"
        echo "xlsft (0.0.0-0) -"
        return
    fi
    local version build date
    version=$(jq -r '.v' "$build_meta_file")
    build=$(jq -r '.b' "$build_meta_file")
    date=$(jq -r '.d' "$build_meta_file")
    echo "xlsft (${version}-${build}) ${date}"
}


init_build_meta() {
    local version
    version=$(read_package_version)
    local now
    now=$(date -Iseconds)

    if [[ -f "$build_meta_file" ]]; then
        local current_b
        current_b=$(jq -r '.b' F"$build_meta_file" 2>/dev/null)
        if [[ "$current_b" =~ ^[0-9]+$ ]]; then
            current_b=$((current_b + 1))
        else
            current_b=1
        fi
    else
        current_b=1
    fi

    jq -n --arg v "$version" --argjson b "$current_b" --arg d "$now" \
        '{v: $v, b: $b, d: $d}' > "$build_meta_file"

    echo "[INFO] build.json updated: version=$version, build=$current_b, date=$now"
}

init() {
    cd "$project_dir" || { echo "[ERROR] Failed to cd to project directory"; exit 1; }
    rm -f "$log_file"
    init_build_meta
}

first_message() {
    echo "[INFO] Sending initial message..."
    local resp
    resp=$(send_msg $'*Статус:* ⌛ Ожидается сборка\n*Билд:* -\n*Время сборки:* -\n*Последний коммит:* -\n*Последний апдейт логов:* -')
    message_id=$(echo "$resp" | grep -o '"message_id":[0-9]*' | cut -d: -f2)

    if [[ -z "$message_id" ]]; then
        echo "[ERROR] Failed to get message_id. Telegram response:"
        echo "$resp"
        exit 1
    fi
    echo "[INFO] Message ID: $message_id"
}

get_short_log() {
    if [[ ! -f "$log_file" ]]; then
        echo "<empty log>"
        return
    fi
    local short_log
    short_log=$(tail -n 20 "$log_file" | sed 's/`/"/g')
    if (( ${#short_log} > 1000 )); then
        short_log="${short_log: -3500}"
    fi
    echo "${short_log:-_}"
}

get_last_commit() {
    git -C "$project_dir" log -1 --pretty=format:'(%h): %s'
}


update_message_loop() {
    while true; do
        local now short_log text resp elapsed
        now=$(date '+%Y-%m-%d %H:%M:%S')
        short_log=$(get_short_log)

        local current_time
        current_time=$(date +%s)
        elapsed=$((current_time - BUILD_START_TIME))
        local elapsed_fmt
        elapsed_fmt=$(printf '%02d:%02d:%02d' $((elapsed/3600)) $((elapsed%3600/60)) $((elapsed%60)))
        local build_info
        build_info=$(read_build_info)
        local last_commit
        last_commit=$(get_last_commit)

        text=$'*Статус:* '"$status_text"$'\n*Билд:* '"$build_info"$'\n*Время сборки:* '"$elapsed_fmt"$'\n*Последний коммит:* '"$last_commit"$'\n*Последний апдейт логов:* '"$now"$'\n```log\n'"$short_log"$'```'


        echo "[INFO] Updating message at $now (elapsed: $elapsed_fmt)"
        resp=$(edit_msg "$text")

        if [[ "$resp" != *"ok"* ]]; then
            echo "[ERROR] Failed to update message. Response: $resp"
        fi

        sleep 1
    done
}

run_build() {
    echo "[LOG] Starting remote build at $(date)" >> "$log_file"
    echo '0be9520e9589f73ab4e0a57eaafd4668' | sudo -S docker compose up --build -d >> "$log_file" 2>&1
    local status=$?
    echo "[LOG] Status: $status" >> "$log_file"
    return $status
}

main() {
    init
    echo "[INFO] Starting build script..."
    first_message

    local start_time
    start_time=$(date +%s)
    export BUILD_START_TIME=$start_time

    update_message_loop &
    local updater_pid=$!

    run_build
    local build_status=$?
    local end_time
    end_time=$(date +%s)
    local total_time=$((end_time - start_time))
    kill "$updater_pid"

    local total_time_fmt
    total_time_fmt=$(printf '%02d:%02d:%02d' $((total_time/3600)) $((total_time%3600/60)) $((total_time%60)))

    if [[ $build_status -eq 0 ]]; then
        status_text="✅ Сборка успешно завершена"
    else
        status_text="❌ Ошибка сборки"
    fi

    local now short_log final_text
    now=$(date '+%Y-%m-%d %H:%M:%S')
    short_log=$(get_short_log)
    local build_info
    build_info=$(read_build_info)
    local last_commit
    last_commit=$(get_last_commit)

    final_text=$'*Статус:* '"$status_text"$'\n*Билд:* '"$build_info"$'\n*Время сборки:* '"$total_time_fmt"$'\n*Последний коммит:* '"$last_commit"$'\n*Последний апдейт логов:* '"$now"$'\n```log\n'"$short_log"$'```'


    echo "[INFO] Final status: $status_text"
    echo "[INFO] Total build time: $total_time_fmt"
    echo "[INFO] Sending final update..."

    edit_msg "$final_text"

    echo "[INFO] Sending full log file..."
    send_log_file "$log_file"
}

main
