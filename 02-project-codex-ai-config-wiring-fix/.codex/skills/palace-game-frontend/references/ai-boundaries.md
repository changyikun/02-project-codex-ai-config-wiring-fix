# AI Boundaries

## Rule

This project is a hard-rule game with AI enhancement, not an AI-driven rule engine.

## AI 1: Narrative Text

Use for:
- dialogue wording
- event copy
- route flavor
- notifications
- opening option phrasing
- Jiaojiao briefings
- scene polish

Do not use for:
- numeric outcomes
- route initialization
- time advancement
- palace-strife resolution
- rank and cold-palace math
- pregnancy or heir-rule decisions

## AI 2: Relationship Judge

Use for:
- classifying the player's chosen line or reply
- mapping dialogue into intent buckets

Expected buckets:
- `friendly`
- `flirt`
- `neutral`
- `cold`
- `reject`

The system then converts the label into numeric changes.

## Relationship Caps

Normal dialogue should be slow.

Per xun, per NPC:
- affection change caused by dialogue must not exceed `5`
- romance/attachment change caused by dialogue must not exceed `5`

Special hard-rule events override the slow cap when required by design.

Examples:
- frame-up / poisoning / severe betrayal should force relationship floors such as `0`, `-10`, or `-20` by severity

## Fallback Requirement

If either AI is offline:
- use local static text or templates for narrative output
- use local button metadata for relationship labels

The user must still be able to complete the frontend flow without AI responses.
