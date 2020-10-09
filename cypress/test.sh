#!/bin/bash
npx discovery -c ./cypress/fixtures/single-model/.discoveryrc.js &
PID=$!
cypress run --headless
kill $PID