-- The public tracking board is gone: it showed how many requests came in and
-- on what stack, which is business information Anadi doesn't want public.
-- Drops the view the board read and the opt-in flag behind it. Run once,
-- after 20261016000000_tickets.sql.

drop view if exists public.public_board;
alter table public.tickets drop column if exists board_opt_in;
