#!/usr/bin/env bash
set -e
trap 'kill 0' SIGINT SIGTERM
(cd api && npm run dev) &
(cd web && npm run dev) &
wait
