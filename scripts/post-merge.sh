#!/bin/bash
set -e
npm install
node scripts/db-migrate.mjs
