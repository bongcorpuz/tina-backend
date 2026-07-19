# Detector Completeness And Source-Card Review

The R10 detector catches many required unsafe forms:

- today is the last day;
- due today;
- due tomorrow;
- due yesterday;
- submit today;
- submit by the end of the day;
- submitted/filed by the end of the day;
- today is April 15;
- already late;
- still on time;
- deadline has passed;
- conditional sentence followed by an immediate submit-by-end-of-day directive;
- Taglish forms such as ngayon ang huling araw, due ngayon, huli ka na.

Independent misses:

- "Please file your annual income tax return today." returns applicable false / sufficient true.
- "File now to avoid penalties." returns applicable false / sufficient true.
- Under a neutral deadline question, model-shaped answers that add "Please file your annual income tax return today to avoid penalties" or "File now to avoid penalties" also do not route to calendar-relative-deadline.

Because the R10 public replacement runs only for answerSupport.stage = calendar-relative-deadline, these missed forms would not receive replacement. This is a P1 detector-completeness gap within R10 scope.

Source-card compatibility:

- Replacement answers with Sec. 51 cards state the general April 15 rule and cite NIRC Sec. 51(C).
- Replacement answers without Sec. 51 omit April 15 and ask for taxable year, return type and applicable deadline/extension details.
- I found no fabricated replacement source and no replacement answer citing April 15 without a Sec. 51 source card.

Some non-replacement RELATED_AUTHORITY_ONLY control answers mention April 15 without Sec. 51 cards. I did not classify this as a replacement source-card failure because those answers were downgraded by proposition-source-sufficiency and not claimed as VERIFIED_CONTROLLING.
