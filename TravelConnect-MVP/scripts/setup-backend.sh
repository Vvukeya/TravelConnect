#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if ! command -v composer >/dev/null 2>&1; then
  echo 'Composer is not installed. Install PHP and Composer first: https://getcomposer.org/' >&2
  exit 1
fi
if [ -d backend ]; then
  echo 'backend/ already exists. Refusing to overwrite it.' >&2
  exit 1
fi
composer create-project laravel/laravel backend
(
  cd backend
  php artisan install:api --no-interaction
)
cp -R backend-overlay/app/. backend/app/
cp -R backend-overlay/routes/. backend/routes/
cp -R backend-overlay/database/. backend/database/
echo 'Laravel starter prepared. Configure backend/.env and run:'
echo '  cd backend && php artisan migrate && php artisan db:seed --class=TravelConnectDemoSeeder && php artisan serve'
echo 'The PWA defaults to offline sample mode. Read README.md before connecting the API.'
