# Teads Home Assignment — Part 2

Technical Solutions Engineer home assignment.

- [Part 2.1 — Ad Creative Review](index.html)
- [Part 2.2 — SQL queries and assumptions](solutions.sql)

## Optional: modular version

The main branch contains the simple implementation for the assignment.

An [improved version](https://github.com/heitorrgarcia07/teads-home-assignment/tree/improved)
is also available, with JavaScript split into modules, results displayed on
the page, and additional rendering tests. Its README includes setup instructions.

## Part 2.1 — Ad Creative Review - simple version

A simple HTML and JavaScript page that simulates reviewing ad creatives from
https://jsonplaceholder.typicode.com/posts. No packages or build step are needed.

Click **Review Ads** to fetch the posts and log a new array of objects containing
`id`, `title`, and `status` in the browser console. The original objects are not changed.

- IDs divisible by 3 are rejected, with their titles converted to uppercase.
- Otherwise, IDs divisible by 2 are approved.
- All remaining IDs are pending.

The button is disabled while a request is running and re-enabled after success
or failure. The page displays progress, success, or failure. `response.ok` checks HTTP errors;
`try/catch` also handles network and response-processing errors.

## Open the page

Open `index.html` in your browser, open Developer Tools → Console, and click
**Review Ads**. Internet access is required to fetch the creatives from the API.

## Test

On success, the console should show an array of 100 objects and the page should say
“Ads reviewed successfully. Check the browser console.”

| ID | Expected status | Expected title |
| --- | --- | --- |
| 1 | pending | Original title |
| 2 | approved | Original title |
| 3 | rejected | Uppercase title |
| 6 | rejected | Uppercase title |

ID 6 verifies that rejection takes priority over approval.

To test HTTP errors, temporarily replace `/posts` in `index.html` with
`/this-does-not-exist`, save, reload, and click the button. Expect a 404 error in
the console and “Unable to review ads. Please try again later.” on the page.
**Restore `/posts`, save, reload, and retest before committing.**

To test network errors, use Developer Tools → Network → Offline and click the
button. Expect the failure message. Restore online mode afterward.

## Automated tests

With Node.js 18 or newer installed, run from the project folder:

```sh
node --test tests/review-ads.test.cjs
```

The tests use Node's built-in test runner, with no additional packages. They run
the JavaScript from `index.html` with a simulated DOM and API responses, so they
work offline and do not require the local HTTP server.

Coverage includes status precedence (IDs 1, 2, 3 and 6), uppercase rejected titles,
new objects without source mutation, the output fields, progress and success
messages, button state during and after requests, HTTP 404/500 errors, network and JSON parsing failures, and recovery on
retry. Browser rendering and the live API are covered by the manual checks above.

## Part 2.2 — SQL

[solutions.sql](solutions.sql) contains the three read-only queries, with notes
and assumptions alongside each answer:

1. Campaigns starting in August 2026 with budgets greater than 5,000, ordered by budget.
2. August CPC per campaign and device, handling zero and missing activity.
3. Campaign performance per advertiser, retaining advertisers without campaigns
   and campaigns without metrics.

Run each query against the tables described in the assignment. The SQL does not
create or modify tables. The queries were checked in PostgreSQL using fictional
sample data; the expected results were confirmed for all three questions.

For Question 2, the query relies on the stated guarantee of at least one August
row per relevant campaign/device combination. For Question 3, supplied advertiser
IDs are assumed to exist in Advertisers, and all campaigns and metric dates are
included because no reporting period or active-campaign filter is specified.
