<?php

namespace App\Core;

final class Response
{
    public static function json(array $payload, int $status = 200): void
    {
        // Disable output buffering if any is active
        while (ob_get_level() > 0) {
            ob_end_clean();
        }

        http_response_code($status);
        header('Content-Type: application/json');
        $json = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        echo $json;
        flush();
    }
}
