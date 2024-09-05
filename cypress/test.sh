#!/bin/bash
npm run transpile
npm run cypress:server &
PID=$!
cypress run --headless
kill $PID
