# Clerk Real estate record keeping
Clerk is a web based application for Real Estate record keeping.  It is a simple and highly automated system for tracking and documenting all actions (real estate related or not) which
focuses on simplifying real estate book keeping.

## Key concepts
### Automation
Some of the features of Clerk to help automate key functions
1. Reads ofx or qfx files to simplify data entry
1. Uses rules to help enter transactions that occur regularly (ie: mortgages, rent payments, credit card payments, ...)
1. Allows for dynamic creation of rules and projects
1. Provides a clean reconciliation feature to verify that all information from each statement
is represented in the data base
1. Allows an optional project feature to group expense transactions for a property
1. Includes reporting as well as data extraction in csv or json format

### Data model
**Transactions**: Information on each entry on statements from banks and other financial institutions  
**Reconciliations**: Record of each reconciliation done for each account. Also, all transactions involved in a
reconciliation are marked for that reconciliation  
**Projects**: Optional feature for transactions so that they can be grouped by individual items (ie: a
rental turnover) for more detailed reporting  
**Houses**: Entry for each house including data put into service and date it came out of service if applicable  
**Accounts**: Checking, Savings, or Credit Card accounts for which transactions are recorded.
One additional type of account is "virtual" for transactions will not show up on a statement
(ie: cash payment or use of a gift card ... for which you should keep a paper receipt)


## Background
Clerk was the result of an IRS audit on a real estate investor who was not doing a good
job keeping all records.  When the IRS demanded explanations of countless transactions that
had occurred 4 years prior ... a great deal of expensive and time consuming research was
initiated.  During this process, they searched the accounting software options and could not
find one that was reasonably priced, performed the desired functions, and had the needed data
model.

The good news is that entering vast amounts of data from years prior up through the present
allowed the audit to go well and allowed for incremental and iterative improvements in the
vision for Clerk.  Thus Clerk was "field tested" before the vision was complete.  As others
began using Clerk, additional functions were added.