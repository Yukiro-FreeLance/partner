# Cycle tracker

CoupleSync can record menstrual cycles, daily check-ins, and a private couple calendar. The records are personal tracking notes. They are not a medical diagnosis, a fertility treatment, or a confirmation of ovulation or pregnancy.

## What you see

- **Overview** shows the current cycle day, a phase ring, the estimated next period, period length, fertile window, and ovulation date. Recorded dates and predicted dates are labeled differently.
- **Check-in** stores symptoms, mood, energy, sex drive, bleeding, cervical mucus, sleep, stress, a moment, intimacy preferences, optional sexual activity and contraception, and a private journal note. Earlier days can be opened and saved again.
- **Calendar** has month and week views. Filled days are recorded period days. Dashed days are predicted. A lavender outline is the predicted fertile window.
- **Insights** charts cycle length, symptoms, and sex drive. Sex drive is your log, not a claim that a phase causes desire.
- **Shared** shows only what a partner has explicitly allowed.
- **Privacy** holds sharing switches, reminders, export, and deletion.

A late period shows a neutral note that a pregnancy test may be useful. The app does not decide that someone is pregnant. Pregnancy test results stay private.

## Predictions

The default calculator lives in `src/lib/cycle/predict.ts`. It uses recorded period start dates.

- Cycle length is the average of up to six recent gaps between 15 and 90 days. With fewer than two usable gaps, it uses the length you set, usually 28.
- The next period is the last recorded start plus that length. If today passes that date and no new period is logged, the date stays put and the screen says the period is later than the estimate. It does not roll forward and it does not assume pregnancy.
- Ovulation is estimated as the next period minus the luteal length, usually 14 days. The fertile window is the five days before that date through that date, because sperm can survive for several days. Both are marked predicted.
- The phase is menstrual during the recorded or estimated period, follicular until the day before the estimated ovulation, ovulation on that day, and luteal after it.
- Dates are calendar days in the time zone on the privacy page. Adding days does not use the server's local midnight, so a daylight-saving change does not skip a date.

## Optional external calculator

Several well-known cycle apps do not offer a public prediction API. APIVerve publishes a menstrual cycle calculator:

- Docs: https://docs.apiverve.com/ref/menstrualcycle
- Request: `GET https://api.apiverve.com/v1/menstrualcycle`
- Auth: `x-api-key`
- Inputs: `last_period`, `cycle_length` (21–35), `period_length`, `cycles`
- Price: 2 credits per call. The free plan includes 200 credits a month and is non-commercial. Paid plans start at $29.99 a month. See https://apiverve.com/pricing
- Their own response says the result is an estimate and not medical advice.
- APIVerve says request bodies are not kept after the call, usage logs are kept for 90 days, and processing is on Google Cloud in the United States. See https://apiverve.com/security

That service repeats calendar arithmetic. It does not confirm ovulation. CoupleSync therefore keeps it off unless all of the following are true:

1. `CYCLE_PREDICTION_PROVIDER=apiverve`
2. `CYCLE_PREDICTION_API_KEY` is set on the server only
3. The signed-in person turns on the consent checkbox

The request sends the last period start, cycle length, and period length. It does not send symptoms, notes, sex, contraception, or pregnancy logs. If the call fails, times out, or returns dates that are not usable, the screen falls back to the CoupleSync calculation and says so. External dates are still labeled as predictions.

Leave the provider as `local` when you do not want period dates to leave the server. That is the right default for sensitive health data, including where GDPR, HIPAA, or similar rules may apply. This document is not legal advice.

## Privacy

Tables are in `supabase/migrations/20261025193000_cycle_tracker.sql`. Row Level Security lets the signed-in owner read and write their own rows. A partner cannot read check-ins, periods, pregnancy logs, or reminders through the Data API. The server builds a partner view only from active share grants.

Sharing needs a category switch and, for a daily note, a share level on that day. Leaving a couple revokes grants and turns the switches off. Administrators who are viewing the app as someone else do not receive cycle records. Invitation codes, QR codes, and public profiles do not include them.

Reminders use short wording such as "You have a personal reminder in CoupleSync." so a lock screen does not name a period or a pregnancy test.

Export: `/api/cycle/export` and the account export. Delete: the privacy page, or `DELETE /api/cycle/data` with `{ "confirm": "DELETE" }`.

## API

Signed-in routes, all owner-scoped:

- `GET /api/cycle`
- `POST /api/cycle/check-in` and `DELETE /api/cycle/check-in?id=`
- `POST /api/cycle/periods` and `DELETE /api/cycle/periods?id=`
- `POST /api/cycle/events` and `DELETE /api/cycle/events?id=`
- `POST /api/cycle/reminders` and `DELETE /api/cycle/reminders?id=`
- `POST /api/cycle/reminders` with `{ "run": true }` delivers due reminders
- `POST /api/cycle/share`
- `POST /api/cycle/pregnancy` and `DELETE /api/cycle/pregnancy?id=`
- `GET /api/cycle/partner` returns only the filtered partner view
- `GET /api/cycle/export`
- `DELETE /api/cycle/data`

## Sample data

`ensureDemo` inserts fictional periods and check-ins for `maya@demo.couplesync.local` only, and only when that profile has no periods yet. The notes say they are fictional. Real accounts do not receive those rows. Restarting local development can restore the sample if Maya's periods were removed.

## Tests

```bash
npm test
```

Cycle tests cover date arithmetic, time zones, late periods, confirmed versus predicted days, fertility wording, partner grants, and the external calculator fallback.
