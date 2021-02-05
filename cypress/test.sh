#!/bin/bash
npm run cypress:server &
PID=$!
cypress run --headless
kill $PID
