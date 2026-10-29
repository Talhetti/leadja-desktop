# LeadJá local — product notes

## Inventory

- Objects: leads, searches, score signals, messages, notes and CRM stages.
- Fields: company, category, address, phone, site, rating, reviews, score, stage and source.
- User: one owner working locally, usually on a desktop, returning daily to contact the best leads.
- Main job: identify the strongest uncontacted opportunity and open WhatsApp with a useful message.
- Supporting jobs: search a niche and city, explain the score, move a lead through the pipeline and export data.
- Typical volume: tens to a few thousand local businesses, with 5–30 visible at once.
- Product name: LeadJá; scope: a private local workspace.
- Honest states: empty database, failed external search, missing phone/site and real zero reviews.
- Source: Google Maps through a local Docker worker; CSV import remains available when search is unavailable.
- Persistence: SQLite on the same computer, without accounts, billing or cloud services.

## Questions and findings

- Leads: “Quem merece contato agora?” Finding: hot leads with WhatsApp and no site appear first.
- Search: “Como encontro the next useful batch?” Finding: narrow niche + city searches are easier to act on.
- CRM: “Who is waiting for my next action?” Finding: contacted and negotiating leads remain visible by stage.
- Settings: “What makes a lead good for my offer?” Finding: weights and message copy must be editable.

## Direction

- Style: `framed-sheet`, seed `1782285265`.
- Reason: this is a daily B2B work surface; a single tinted frame keeps navigation quiet while the white sheet carries dense lead data.
- Face: a low-chroma green-grey frame derived from the LeadJá identity; the main score uses a deeper green-teal.
- Signature element: the score explanation is rendered as a compact “opportunity receipt” made from the exact deterministic rules that added up to the total.
- No redraws.

## Grid

- Desktop shell: 228px sidebar + flexible sheet; sheet padding 24px.
- Content grid: 12 columns with one 24px gutter. Primary list uses 9 columns and the action rail uses 3.
- Tablet: the sidebar folds; blocks stack when either would be narrower than 340px.
- Phone: 16px margins, one region at a time, table rows become two-line lead items.

