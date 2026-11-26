# MarketOS launch in Nigeria

## Privacy and merchant records

Shop settings provides an authenticated JSON download of the merchant profile, products, movements, cash transactions, register sessions, credit records and repayments. The download reads these records in pages. Changes made while it is running can appear in the file. It contains customer names, contact information and balances where merchants have recorded them.

Before publishing the privacy notice, establish who operates MarketOS. Use the operator’s actual legal name alongside the MarketOS brand. Set up a monitored privacy address on the operator’s verified domain and test delivery and replies from outside the organisation.

Document the purposes and legal bases for account and shop data, service providers and hosting locations, cross-border safeguards where applicable, retention periods and backup expiry. Distinguish MarketOS’s responsibilities for merchant accounts from its responsibilities when processing customer records for merchants. Use the findings in the public notice, merchant terms and data processing agreement. The public /privacy form accepts access, correction, deletion and other requests without a login. The platform owner reviews pending cases in Admin console → Privacy requests. Monitor this queue, contact the requester, verify their connection to the account or transaction, coordinate with the merchant where appropriate and reply through a verified channel. Close the case after responding to remove its intake details from the queue. Closing a case does not alter any shop records. Verify identity and scope before releasing records. A customer seeking their own information must never receive the merchant’s full shop download.

Review whether registration as a controller or processor of major importance applies. Include the right to complain to the Nigeria Data Protection Commission in the notice. Record who handles requests and incidents, then test both workflows. [Nigeria Data Protection Act](https://ndpc.gov.ng/wp-content/uploads/2024/03/Nigeria_Data_Protection_Act_2023.pdf) · [NDPC implementation guidance](https://ndpc.gov.ng/wp-content/uploads/2025/03/NDP-ACT-GAID-2025-MARCH-20TH.pdf)

## Nigerian sales receipts and invoicing

Identify the pilot merchants’ tax status, turnover and transaction types. Check the Nigeria Revenue Service rollout for those merchants before enabling e-invoicing claims. Assess MarketOS subscription billing separately from the sales its merchants record. Confirm VAT treatment for the pilot catalogue and the particulars required on their receipts and invoices.

For merchants in scope, establish the integration route and test sample invoices, identifiers, validation responses, corrections and retries with the applicable provider before going live. Keep the distinction clear in the UI between a shop receipt and an invoice accepted by the tax system. [NRS rollout and updates](https://einvoice.nrs.gov.ng/) · [NRS integration guide](https://einvoice.nrs.gov.ng/docs/introduction/getting-started)

## Operational acceptance

- Restore a database backup into an isolated environment. Compare per-shop record counts, balances and links between sales, stock movements and payments. Record the backup age and time to recovery.
- Test sign-up, Google sign-in, email delivery, password recovery and sign-out on the owned production domain. Confirm that redirect URLs and email links use it.
- Verify a sale, an amended cash transaction and a day close with a pilot shop's currency and time zone. Check signed-in mobile and keyboard workflows, screen-reader labels, errors and focus restoration.
- Keep the release evidence with its commit, environment, result and unresolved issues. Record the pilot operator’s sign-off before expanding availability.
