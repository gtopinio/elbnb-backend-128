#!/bin/bash

# Function to monitor Heroku logs
monitor_logs() {
  while true; do
    log_output=$(heroku logs --tail)
    if echo "$log_output" | grep -q "ER_USER_LIMIT_REACHED"; then
      echo "Eyy max connections bro"
    fi
  done
}

# Call the log monitoring function
monitor_logs