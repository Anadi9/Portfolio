# Draft: LICENSE for the free Production Kit

Status: **approved by Anadi on 2026-09-28 and applied in kit 1.2.1.** His
decisions: public reposting with credit is allowed (decision 1 as drafted), the
credit links to the kit page (decision 2 as drafted), and the paid pack zips
keep the old buyer license (decision 3), which the kit's build now copies in
from `release/LICENSE-pack`.

This is a plain-English license written for this kit, not legal advice. If the
kit ever matters commercially, have a lawyer read it.

## Why it needs replacing

The current LICENSE was written for a paid product:

- It is granted to "the person or company that bought the kit".
- It forbids giving the kit away or posting it publicly, "whether free or paid".

On a free public download, both are wrong: nobody buys it, and the site itself
gives it away. A standard "non-commercial" license (such as Creative Commons
BY-NC) doesn't fit either, because it would forbid using the kit in client
work, which the kit page promises.

## The draft

```text
The Production Kit - License
Copyright (c) 2026 Anadi Thakur.

The kit is free. Anyone who downloads it ("you") may use it on these terms.
By using the kit you agree to them.

YOU MAY
- Use the kit's files in any number of projects, including commercial
  projects and work you do for clients.
- Copy, edit and adapt the files inside those projects (for example,
  committing CLAUDE.md, the skills and the rules to a project's repository).
- Share the kit, as downloaded or with your own edits, with anyone, for free,
  as long as you keep this LICENSE file with it and credit the source:
  "The Production Kit by Anadi Thakur, https://anadithakur.in/products/production-kit".

YOU MAY NOT
- Sell the kit, or any substantial part of it, as a product in its own
  right: on its own, or bundled into a paid template, course, prompt pack,
  skill pack or other collection of files like these. This doesn't stop you
  charging for a project, app or client work that uses the files.
- Remove this LICENSE or the credit from a copy you share, or present the kit
  as your own work.

NO WARRANTY
The kit is provided "as is", without warranty of any kind. It reduces
common mistakes but does not guarantee that any application is secure,
correct or compliant. You are responsible for reviewing and testing what
your AI tools produce. In no event shall the author be liable for any
claim, damages or other liability arising from the use of the kit.

Questions about licensing: https://anadithakur.in
```

## What changed, line by line

| Old (buyer license) | New (free license) |
|---|---|
| "Copyright (c) 2026 Anadi Thakur. All rights reserved." | "Copyright (c) 2026 Anadi Thakur." ("All rights reserved" dropped: the license now grants most of them) |
| Granted to the person or company that bought the kit | Granted to anyone who downloads it |
| "By using the kit you agree to these terms." | Kept |
| Use in projects you own or build for clients | Any projects, and says commercial and client work outright |
| Copy, edit and adapt the files inside those projects | Unchanged |
| Share only with your own team or company | Share with anyone, for free, with the LICENSE and a credit line |
| No reselling, sublicensing, giving away or republishing as a standalone product, "free or paid" | No selling as a product in its own right, alone or bundled with similar files; giving away is allowed; "sublicense" dropped because free sharing is now allowed |
| No posting the files publicly on their own | Allowed, with the LICENSE and the credit |
| (nothing) | No removing the LICENSE or credit from a shared copy, or passing the kit off as your own |
| No warranty | Unchanged, word for word |

## Decisions for Anadi

1. **Sharing with credit.** The draft lets people repost the kit publicly (for
   example in a GitHub repo) as long as the credit line and LICENSE stay. That
   spreads the kit and every copy links back to you. If you'd rather keep this
   site the only place to get it, replace the third YOU MAY bullet with:
   "Share the kit with members of your own team or company."
2. **Credit wording.** The credit line points at the kit page, so reposts send
   people to the site where the free audit is offered. Change the URL if you'd
   rather they land on the home page.
3. **The paid packs.** The kit's build (`release/build-packs.mjs`) copies the
   same LICENSE into every pack zip, so a 1.2.1 rebuild gives the paid packs
   this free license too. The site no longer links to checkout, but the
   checkout endpoint still exists server-side. If no one can buy packs any
   more, that's fine: every zip says the same true thing. If you ever sell
   packs again, give those zips a buyer license at that point.

## How to apply, once approved

1. In the kit's source (`~/Downloads/production-kit/`), replace `LICENSE` with
   the text above and add a CHANGELOG entry: version 1.2.1, "The kit is free;
   new license."
2. Build release 1.2.1 with the kit's `release/build-packs.mjs`, which writes
   `release/dist/1.2.1/` with a `manifest.json` and the zips.
3. In this repo, run
   `node scripts/kit-add-release.mjs ~/Downloads/production-kit/release/dist/1.2.1`,
   then add the new release's import to `RELEASES` in `src/data/kit/index.ts`,
   newest first.
4. Upload the zips to the private bucket:
   `node scripts/kit-upload.mjs ~/Downloads/production-kit/release/dist/1.2.1`.
   Don't skip this: earlier buyers' downloads pages list every release of the
   packs they own, so a 1.2.1 in `RELEASES` without its zips in the bucket
   gives them broken download links.
5. Copy the new full-kit zip into `public/downloads/` and delete the 1.2.0 zip
   there (it carries the old license). `src/data/kit/free.test.ts` fails until
   the file matches the new manifest.
6. Update the kit page's "Can I use it for client work?" answer to say sharing
   is allowed (if you kept decision 1), then remove the "Do not merge or deploy"
   warning from the plan.
