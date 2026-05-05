<?php

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;

final class ChatController
{
    public function index(Request $request): void
    {
        Response::json([
            'status' => 'success',
            'data' => [
                'roomName' => 'Team Group',
                'activeMembers' => 6,
                'groupTitle' => 'Internal Audit Q3',
                'description' => 'Project-specific communication channel for quarterly audit cycle.',
                'contacts' => ['Team Group', 'Mona', 'Dedi', 'Adi'],
                'messages' => [
                    [
                        'from' => 'Mona',
                        'text' => 'I just updated the fieldwork document for Q3 Internal Audit.',
                    ],
                    [
                        'from' => 'Dedi',
                        'text' => 'Thanks Mona, I will review before call this afternoon.',
                    ],
                    [
                        'from' => 'You',
                        'text' => 'Inventory check report already uploaded to shared folder.',
                    ],
                ],
            ],
        ]);
    }
}
