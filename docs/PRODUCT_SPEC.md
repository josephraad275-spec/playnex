# Product specification

PlayNex is an invitation-first social gaming platform. The initial scope is a private, adult-only browser beta with original Tic-Tac-Toe, Four in a Row, Quick Trivia Battle and Checkers implementations. “Adult-only” is an initial product restriction pending jurisdiction-specific legal review, not a compliance guarantee.

## Core journey

A player chooses a game, enters a guest display name, creates a private room, copies or shares its invitation, and waits for another player. Both ready up; the host starts. Valid moves update both clients. A final result enables a rematch. Reloading an existing browser session should restore membership where the session remains valid.

WhatsApp integration uses official share URLs; it opens a user-controlled WhatsApp composer. Play happens in the browser. No contact access, unsolicited messages, or in-chat gameplay is assumed. A shared link is a bearer invitation: anyone receiving it may occupy an available seat.

## Release boundaries

No unrestricted chat, voice chat, gambling, behavioral ads or real payments. Optional email/password account and own-profile integration is implemented but requires an authorized Supabase project and live verification. Ephemeral reporting/blocking and a backend-authorized administrator review/catalog interface are implemented for private evaluation; they are not durable moderation operations. Friends, tournaments, global leaderboards, persistent achievements and native releases remain expansion work. UI must describe unavailable functionality honestly, rather than show invented users, earnings or rankings.

Success means reliable completed matches and organic invitations. One million legitimate downloads is a stretch goal; browser visits and PWA installations must not be reported as store downloads.
