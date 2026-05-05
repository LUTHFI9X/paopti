<?php

return [
    'name' => 'SPI-Hub API',
    'env' => getenv('APP_ENV') ?: 'local',
    'debug' => (bool) (getenv('APP_DEBUG') ?: true),
    'timezone' => 'Asia/Jakarta',
];
