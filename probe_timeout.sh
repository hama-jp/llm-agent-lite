#!/bin/bash
echo "Starting timeout probe..." > timeout_log.txt
i=0
while true; do
  echo "Tick $i: $(date)" >> timeout_log.txt
  sleep 1
  i=$((i+1))
done
